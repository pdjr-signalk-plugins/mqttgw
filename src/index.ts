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

import { connect, MqttClient } from 'mqtt'
import * as _ from 'lodash'

import { Delta } from 'signalk-libdelta'

const PLUGIN_ID: string = 'mqttgw';
const PLUGIN_NAME: string = 'pdjr-skplugin-mqttgw'
const PLUGIN_DESCRIPTION = 'Exchange data with an MQTT server'
const PLUGIN_SCHEMA: object = {
  "type": "object",
  "properties": {
    "broker": {
      "title": "Broker configuration",
      "type": "object",
      "properties": {
        "mqttBrokerUrl": {
          "title": "MQTT broker url (eg: mqtt://192.168.1.203)",
          "type": "string"
        },
        "mqttClientCredentials": {
          "title": "MQTT client credentials (as 'username:password')",
          "type": "string"
        },
        "rejectUnauthorised": {
          "title": "Reject unauthorised?",
          "type": "boolean"
        }
      }
    },
    "publication": {
      "title": "Publication settings",
      "type": "object",
      "properties": {
        "root": {
          "title": "Prefix to apply to all published topic names",
          "type": "string"
	      },
        "retainDefault": {
          "title": "Default retain setting for published topic data",
          "type": "boolean"
        },
        "intervalDefault": {
          "title": "Default minimum interval between topic updates in seconds",
          "type": "number"
        },
        "metaDefault": {
          "title": "Publish any available meta data associated with a path",
          "type": "boolean",
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
            }
          }
	      }
      }
    },
    "subscription": {
      "type": "object",
      "properties": {
        "root": {
          "title": "Prefix to apply to all received subscription paths",
          "type": "string"
        },
        "topics": {
          "type": "array",
          "title": "MQTT paths to receive",
          "default": [],
          "items": {
            "type": "object",
            "properties": {
              "topic": { 
                "title": "Topic",
                "type": "string"
              },
              "path": { 
                "type": "string", 
                "title": "Override the path name automatically generated from topic"
              }
            }
          }
        }
      }
    }
  },
  "default": {
    "broker": {
      "mqttBrokerUrl": "mqtt:127.0.0.1",
      "mqttClientCredentials": "username:password",
      "rejectUnauthorised": true
    },
    "publication": {
      "root": "signalk/",
      "retainDefault": true,
      "intervalDefault": 60,
      "metaDefault": false,
      "paths": []
    },
    "subscription": {
      "root": "mqtt.",
      "topics": []
    }
  }
};
const PLUGIN_UISCHEMA: object = {};

const BROKER_RECONNECT_PERIOD = 60000;

module.exports = function(app: any) {
  let unsubscribes: (() => void)[] = []

  const plugin: SKPlugin = {

    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    description: PLUGIN_DESCRIPTION,
    schema: PLUGIN_SCHEMA,
    uiSchema: PLUGIN_UISCHEMA,
    options: {},

    start: function(options: any) {
      let delta = new Delta(app, plugin.id);

      plugin.options = _.cloneDeep(plugin.schema.default)
      _.merge(plugin.options, options)
      plugin.options.publication.paths = plugin.options.publication.paths.reduce((a: any, path: any) => {
        if (path.path) {
          a.push({
            path: path.path,
            topic: `${plugin.options.publication.root}${(path.topic)?path.topic:(path.path.replaceAll('.','/'))}`,
            retain: (path.retain)?path.retain:plugin.options.publication.retainDefault,
            interval: (path.interval)?path.interval:plugin.options.publication.intervalDefault,
            meta: (path.meta)?path.meta:plugin.options.publication.metaDefault
          })
        } else app.setPluginError("dropping publication with missing 'path' property")
        return(a)
      }, [])
      plugin.options.subscription.topics = plugin.options.subscription.topics.reduce((a: any, topic: any) => {
        if (topic.topic) {
          a.push({
            topic: topic.topic,
            path: `${plugin.options.subscription.root}${(topic.path)?topic.path:topic.topic}`.replace('/','.')
          })
        } else app.setPluginError("dropping subscription with missing 'topic' property")
        return(a)
      }, [])

      app.debug(`using configuration: ${JSON.stringify(plugin.options, null, 2)}`)

      const client: MqttClient = connect(
        plugin.options.broker.mqttBrokerUrl,
        {
          rejectUnauthorized: plugin.options.broker.rejectUnauthorised,
          reconnectPeriod: BROKER_RECONNECT_PERIOD,
          clientId: app.selfId,
          username: plugin.options.broker.mqttClientCredentials.split(':')[0].trim(),
          password: plugin.options.broker.mqttClientCredentials.split(':')[1].trim()
        }
      )
        
      client.on('error', (err) => {
        app.setPluginError(`MQTT broker connection error (${err})`)
      });
        
      client.on('connect', () => {
        app.setPluginStatus(`connected to broker ${plugin.options.broker.mqttBrokerUrl}`)
        if ((plugin.options.subscription) && (plugin.options.subscription.topics) && (Array.isArray(plugin.options.subscription.topics)) && (plugin.options.subscription.topics.length > 0)) {
          app.debug(`subscribing to ${plugin.options.subscription.topics.length}`)
          plugin.options.subscription.topics.forEach((topic: any) => {
            app.debug(`subscribing to topic '${topic.topic}'`)
            client.subscribe(topic.topic)
          })
        }
        if ((plugin.options.publication) && (plugin.options.publication.paths) && (Array.isArray(plugin.options.publication.paths)) && (plugin.options.publication.paths.length > 0)) {
          app.debug(`publishing ${plugin.options.publication.paths.length} paths`)
          startSending(plugin.options.publication, client)
        }
        unsubscribes.push(() => client.end())
      })
        
      client.on('message', function(topic, message) {
        var path = plugin.options.subscription.topics.reduce((a: any, t: any) => { return(((topic == t.topic) && (t.path))?t.path:a) }, (plugin.options.subscription.root + topic.replace(/\//g, ".")))
        var value: string | number = message.toString()
        if (!isNaN(parseFloat(value))) {
          value = parseFloat(value)
        } else {
          if (!isNaN(parseInt(value))) {
            value = parseInt(value);
          }
        }                                                                                        
        app.debug(`received message: '${value}' on topic: '${path}'`);                                                                                                
        delta.addValue(path, value).commit().clear();                                                                                       
      })

      function startSending(publicationoptions: any, client: any) {
        var value;
    
        publicationoptions.paths.forEach((path: any) => {
          app.debug(`publishing topic '${path.topic}'`);
          if (path.meta) app.debug(`publishing topic '${path.topic}/meta'`);
    
          unsubscribes.push(app.streambundle.getSelfBus(path.path)
          .toProperty()                 // examine values not change events
          .sample(path.interval * 1000) // read value at the configured interval
          .skipDuplicates((a: any, b: any) =>      // detect changes by value id or, if missing, by value
            (a.value.id)?(a.value.id === b.value.id):(a.value === b.value)
          )
          .onValue((value: any) => {
            app.debug(`updating topic '${path.topic}' with '${JSON.stringify(value.value, null, 2)}'`);
            client.publish(path.topic, JSON.stringify(value.value), { qos: 1, retain: path.retain });
            
            // Publish any selected and available meta data just once the
            // first time a data value is published.
            if (path.meta) {
              value = app.getSelfPath(path.path);
              if ((value) && (value.meta)) {
                client.publish(`${path.topic}/meta`, JSON.stringify(value.meta), { qos: 1, retain: true });
                app.debug(`updating topic '${path.topic}/meta' with '${JSON.stringify(value.value, null, 2)}'`);
                path.meta = false;
              }
            }
    
          }))
        })
      }
    
    },

    stop: function() {
      unsubscribes.forEach(f => f());
    }
  }

  return plugin
}

interface SKPlugin {
  id: string,
  name: string,
  description: string,
  schema: any,
  uiSchema: any,

  start: (options: any) => void,
  stop: () => void,

  options: any
}
