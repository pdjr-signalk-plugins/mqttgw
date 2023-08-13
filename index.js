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
      "properties": {
        "url": {
          "type": "string",
          "title": "MQTT server url (eg: mqtt://192.168.1.203)"
        },
        "username": {
          "type": "string",
          "title": "MQTT server client username"
        },
        "password": {
          "type": "string",
          "title": "MQTT server client password"
        },
        "rejectUnauthorised": {
          "type": "boolean",
          "title": "Reject unauthorised",
          "default": true
        }
      },
      "required": [ "url", "username", "password" ]
    },
    "publication": {
      "type": "object",
      "properties": {
        "root": {
          "type": "string",
          "title": "Prefix to apply to all published topic names",
          "default": "signalk/"
	      },
        "retainDefault": {
          "type": "boolean",
          "title": "Default retain setting for published topic data",
          "default": true
        },
        "intervalDefault": {
          "type": "number",
          "title": "Default minimum interval between topic updates in seconds",
          "default": 60
        },
        "metadDefault": {
          "type": "boolean",
          "title": "Publish any available meta data associated with a path",
          "default": false
        },
	      "paths": {
          "type": "array",
          "title": "Signal K self paths which should be published to the remote MQTT server",
          "items": {
            "type": "object",
            "properties": {
              "path": {
                "type": "string",
                "title": "Path"
              },
              "topic": {
                "type": "string",
                "title": "Override the topic name automatically generated from path"
              },
              "retain": {
                "type": "boolean",
                "title": "Override the default publication retain setting for this item"
              },
              "interval": {
                "type": "number",
                "title": "Override the default interval between publication events for this item"
              },
              "meta": {
                "type": "boolean",
                "title": "Override the default setting for meta data publication"
              }
            },
            "required": [ "path" ]
          },
          "default": []
	      }
      }
    },
    "subscription": {
      "type": "object",
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
            "properties": {
              "topic": { "title": "Topic", "type": "string" },
              "path": { "type": "string", "title": "Override the path name automatically generated from topic" }
            },
            "required": [ "topic" ]
          }
        }
      }
    }
  },
  "required": [ "broker" ],
  "default": {
    "broker": {
      "url": "mqtt:127.0.0.1",
      "username": "",
      "password": "",
    },
    "publication": {
      "root": "signalk/",
      "paths": []
    },
    "subscription": {
      "root": "mqtt.",
      "topics": []
    }
  }
};
const PLUGIN_UISCHEMA = {};

const BROKER_RECONNECT_PERIOD = 60000;

const PUBLICATION_RETAIN_DEFAULT = true;
const PUBLICATION_INTERVAL_DEFAULT = 60;
const PUBLICATION_META_DEFAULT = false;

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
    if (Object.keys(options).length == 0) {
      options = plugin.schema.properties.default;
      app.savePluginConfiguration(options, () => { app.debug("saving default configuration"); });
      log.W("plugin must be configured before use");
    } else {
      if ((options.broker) && (options.broker.url) && (options.broker.username) && (options.broker.password)) {

        const client = mqtt.connect(options.broker.url, {
          rejectUnauthorized: (options.broker.rejectUnauthorised || plugin.schema.properties.broker.rejectUnauthorised.default),
          reconnectPeriod: BROKER_RECONNECT_PERIOD,
          clientId: app.selfId,
          username: options.broker.username,
          password: options.broker.password
        });
        
        client.on('error', (err) => {
          log.E("error on connection to MQTT broker at '%s'", options.broker.url);
          app.debug("reported connection error = %s", err);
        });
        
        client.on('connect', () => {
          log.N("connected to broker at '%s'", options.broker.url);
          if ((options.subscription) && (options.subscription.topics) && (Array.isArray(options.subscription.topics)) && (options.subscription.topics.length > 0)) {
            log.N("subscribing to %d topics", options.subscription.topics.length, false);
            options.subscription.topics.forEach(topic => {
              app.debug("subscribing to topic '%s'", topic.topic);
              client.subscribe(topic.topic);
            });
          }
          if ((options.publication) && (options.publication.paths) && (Array.isArray(options.publication.paths)) && (options.publication.paths.length > 0)) {
            log.N("publishing %d paths", options.publication.paths.length, false);
            startSending(options.publication, client);
          }
          unsubscribes.push(_ => client.end());
        });
        
        client.on('message', function(topic, message) {
          var path = options.subscription.topics.reduce((a,t) => { return(((topic == t.topic) && (t.path))?t.path:a) }, (options.subscription.root + topic.replace(/\//g, "."))); 
          var value = message.toString();                                                                                                                           
          if ((!isNaN(value)) && (!isNaN(parseFloat(value)))) value = parseFloat(value);                                                                                        
          if ((!isNaN(value)) && (!isNaN(parseInt(value)))) value = parseInt(value);                                                                                        
          app.debug("received topic: %s, message: %s", path, value);                                                                                                
          delta.addValue(path, value).commit().clear();                                                                                       
        });

      } else {
        log.E("plugin configuration broker property is missing or invalid");
      }
    } 
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
  }

  function startSending(publicationoptions, client) {
    var value;

    publicationoptions.root = (publicationoptions.root || plugin.schema.properties.publication.root.default);
    publicationoptions.retainDefault = (publicationoptions.retainDefault || plugin.schema.properties.publication.retainDefault.default);
    publicationoptions.intervalDefault =(publicationoptions.intervalDefault || plugin.schema.properties.publication.intervalDefault.default);
    publicationoptions.metadDefault = (publicationoptions.metadDefault || plugin.schema.properties.publication.metadDefault.default);

    publicationoptions.paths.forEach(path => {
      if ((path.path) && (path.path != '')) {

        path.topic = ((publicationoptions.root)?publicationoptions.root:'') + (((path.topic) && (path.topic != ''))?path.topic:(path.path.replace(/\./g, "/")));
        path.retain = (path.retain || publicationoptions.retainDefault);
        path.interval = (path.interval || publicationoptions.intervalDefault);
        path.meta = (path.meta || publicationoptions.metadDefault);
        path.metatopic = path.topic + "/meta";

        app.debug("publishing topic '%s'", path.topic);
        if (path.meta) app.debug("publishing topic '%s'", path.metatopic);

        unsubscribes.push(app.streambundle.getSelfBus(path.path).throttle(path.interval * 1000).skipDuplicates((a,b) => (a.value == b.value)).onValue(value => {
          client.publish(path.topic, JSON.stringify(value.value), { qos: 1, retain: path.retain });
          app.debug("updating topic '%s' with '%s'", path.topic, value);
        
          // Publish any selected and available meta data just once the
          // first time a data value is published.
          if (path.meta) {
            value = app.getSelfPath(path.path);
            if ((value) && (value.meta)) {
              client.publish(path.metatopic, JSON.stringify(value.meta), { qos: 1, retain: true });
              app.debug("updating topic '%s' with '%s'", path.metatopic, value);
              path.meta = false;
            }
          }

        }));
      }
    });
  }

  return plugin;

}
