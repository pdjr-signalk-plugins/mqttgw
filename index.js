/*
 * Copyright 2016 Teppo Kurki <teppo.kurki@iki.fi>
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

const fs = require('fs');
const mqtt = require('mqtt');
const Log = require("./lib/signalk-liblog/Log.js");
const Delta = require("./lib/signalk-libdelta/Delta.js");

const PLUGIN_ID = "mqttgw";
const PLUGIN_NAME = "MQTT gateway";
const PLUGIN_DESCRIPTION = "Exchange data with an MQTT server";

const PLUGIN_SCHEMA_FILE = __dirname + "/schema.json";
const PLUGIN_UISCHEMA_FILE = __dirname + "/uischema.json";

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = PLUGIN_DESCRIPTION;

  plugin.schema = (fs.existsSync(PLUGIN_SCHEMA_FILE))?JSON.parse(fs.readFileSync(PLUGIN_SCHEMA_FILE)):{};
  plugin.uischema = (fs.existsSync(PLUGIN_UISCHEMA_FILE))?JSON.parse(fs.readFileSync(PLUGIN_UISCHEMA_FILE)):{};

  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });

  plugin.start = function(options) {
    if (options) {
      if (options.remoteHost != "") {
        const client = mqtt.connect(options.remoteHost, {
          rejectUnauthorized: options.rejectUnauthorized,
          reconnectPeriod: 60000,
          clientId: app.selfId,
          username: options.username,
          password: options.password
        });

        client.on('error', (err) => {
          log.N("MQTT connection error");
          console.error(err);
        });

        client.on('connect', () => {
          log.N("MQTT client connected to %s (pub %d, sub %d)", options.remoteHost, options.paths.length, options.topics.length);
          options.topics.forEach(topic => { client.subscribe(topic.topic); });
          startSending(options.paths, client);
          unsubscribes.push(_ => client.end());
        });

        client.on('message', function(topic, message) {
          path = options.topics.reduce((a,t) => { return(((topic == t.topic) && (t.path))?t.path:a) }, (options.subscriptionroot + topic.replace(/\//g, "."))); 
          app.debug("received topic: %s, message: %s", path, message.toString());
          (new Delta(app,plugin.id)).addValue(path, message.toString()).commit().clear();
        });
      } else {
        log.E("configuration does not specify the MQTT server");
      }
    } else {
      log.E("missing configuration file");
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
  };


  function startSending(paths, client) {
    paths.forEach(path => {
      if ((path.path) && (path.path != '') && (path.topic) && (path.topic != '')) {
        unsubscribes.push(app.streambundle.getSelfBus(path.path).throttle((path.interval)?(path.interval * 1000):50).skipDuplicates((a,b) => (a.value == b.value)).onValue(value => {
          app.debug("publishing topic: %s, message: %s", path.topic, "" + JSON.stringify(value.value));
          client.publish(path.topic, "" + JSON.stringify(value.value), { qos: 1, retain: (path.retain || false) });
        }));
      }
    });
  }

  return plugin;

}
