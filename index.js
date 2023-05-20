/*
 * Copyright 2021 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

const mqtt = require('mqtt');

const Delta = require("./lib/signalk-libdelta/Delta.js");
const Log = require("./lib/signalk-liblog/Log.js");

const PLUGIN_ID = "mqttgw";
const PLUGIN_NAME = "MQTT gateway";
const PLUGIN_DESCRIPTION = "Exchange data with an MQTT server";
const PLUGIN_SCHEMA = {
  "type": "object",
  "properties": {
    "broker": {
      "type": "object",
      "required": [ "url", "username", "password", "rejectunauthorised" ],
      "properties": {
        "url": {
          "type": "string",
          "title": "MQTT server url (eg: mqtt://192.168.1.203)"
        },
        "username": {
          "type": "string",
          "title": "MQTT server username"
        },
        "password": {
          "type": "string",
          "title": "MQTT server password"
        },
        "rejectunauthorised": {
          "type": "boolean",
          "title": "Reject unauthorised"
        }
      }
    },
    "publication": {
      "type": "object",
      "required": [ "root", "retaindefault", "intervaldefault", "paths" ],
      "properties": {
        "root": {
          "type": "string",
	        "title": "Prefix to apply to all published topic names"
	      },
        "retaindefault": {
          "type": "boolean",
          "title": "Default retain setting for published topic data"
        },
        "intervaldefault": {
          "type": "number",
          "title": "Default minimum interval between topic updates in seconds"
        },
	      "paths": {
          "type": "array",
          "title": "Signal K self paths which should be published to the remote MQTT server",
          "items": {
            "type": "object",
	          "required": [ "path" ],
            "properties": {
              "path": {
                "type": "string",
                "title": "Path"
              },
              "topic": {
                "type": "string",
                "title": "Override the topic name automatically generates from path"
              },
              "retain": {
                "type": "bool",
                "title": "Override the default publication retain setting for this item"
              },
              "interval": {
                "type": "number",
                "title": "Override the default interval between publication events for this item"
              }
            }
          }
	      }
      }
    },
    "subscription": {
      "type": "object",
      "required": [ "root", "topics" ],
      "properties": {
        "root": {
          "type": "string",
          "title": "Prefix to apply to all received subscription paths",
          "default": "mqtt."
        },
        "topics": {
          "type": "array",
          "title": "MQTT paths to receive",
          "default": [],
          "items": {
            "type": "object",
            "required": [ "topic" ],
            "properties": {
              "topic": { "title": "Topic", "type": "string" },
              "path": { "type": "string", "title": "Override the path name automatically generated from topic" }
            }
          }
        }
      }
    }
  }
};
const PLUGIN_UISCHEMA = {};

const OPTIONS_DEFAULT = {
  "broker": {
    "url": "mqtt://192.168.1.2",
    "username": "username",
    "password": "password",
    "rejectunauthorised": false
  },
  "publication": {
    "root": "signalk/",
    "retaindefault": true,
    "intervaldefault": 5,                                                                                                              
    "paths": [
      { "path": "navigation.position", "interval": 60 }
    ]
  },
  "subscription": {
    "root": "mqtt.",                                                                                                                                        
    "topics": [
      { "topic": "$SYS/broker/version" }
    ]
  }
}; 

const PUBLICATION_RETAIN_DEFAULT = true;
const PUBLICATION_INTERVAL_DEFAULT = 60;

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = PLUGIN_DESCRIPTION;
  plugin.schema = PLUGIN_SCHEMA;
  plugin.uiSchema = PLUGIN_UISCHEMA;

  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
  const delta = new Delta(app, plugin.id);

  plugin.start = function(options) {
    if (Object.keys(options).length === 0) {
      options = OPTIONS_DEFAULT;
      app.savePluginOptions(options, () => { log.N("installing default options", false); });
    }

    if (options.broker.url != "") {
      const client = mqtt.connect(options.broker.url, {
        rejectUnauthorized: (options.broker.rejectunauthorised)?options.broker.rejectunauthorised:true,
        reconnectPeriod: 60000,
        clientId: app.selfId,
        username: options.broker.username,
        password: options.broker.password
      });

      client.on('error', (err) => {
        log.E("error connecting to MQTT broker at (%s)", options.broker.url);
        log.E("reported error = %s", err, false);
      });

      client.on('connect', () => {
        log.N("connected to %s (publishing %d paths; subscribing to %d topics)", options.broker.url, options.publication.paths.length, options.subscription.topics.length);
        options.subscription.topics.forEach(topic => { client.subscribe(topic.topic); });
        startSending(options.publication, client);
        unsubscribes.push(_ => client.end());
      });

      client.on('message', function(topic, message) {
        path = options.subscription.topics.reduce((a,t) => { return(((topic == t.topic) && (t.path))?t.path:a) }, (options.subscription.root + topic.replace(/\//g, "."))); 
        app.debug("received topic: %s, message: %s", path, message.toString());
        delta.addValue(path, message.toString()).commit().clear();
      });
    } else {
      log.E("bad or missing configuration file");
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
  }

  function startSending(publicationoptions, client) {
    publicationoptions.paths.forEach(path => {
      if ((path.path) && (path.path != '')) {
        path.topic = ((publicationoptions.root)?publicationoptions.root:'') + (((path.topic) && (path.topic != ''))?path.topic:(path.path.replace(/\./g, "/")));
        path.retain = (path.retain)?path.retain:((publicationoptions.retaindefault)?publicationoptions.retaindefault:PUBLICATION_RETAIN_DEFAULT);
        path.interval = (path.interval)?path.interval:((publicationoptions.intervaldefault)?publicationoptions.intervaldefault:PUBLICATION_INTERVAL_DEFAULT);
        unsubscribes.push(app.streambundle.getSelfBus(path.path).throttle(path.interval * 1000).skipDuplicates((a,b) => (a.value == b.value)).onValue(value => {
          app.debug("publishing topic: %s, message: %s", path.topic, "" + JSON.stringify(value.value));
          client.publish(path.topic, "" + JSON.stringify(value.value), { qos: 1, retain: path.retain });
        }));
      }
    });
  }

  return plugin;

}
