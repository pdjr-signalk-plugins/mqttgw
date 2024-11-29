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
import path = require('path');

const BROKER_URL_DEFAULT: string = 'mqtt://127.0.0.1/'
const PUBLICATION_ROOT_DEFAULT: string = 'signalk/';
const PUBLICATION_INTERVAL_DEFAULT: number = 5;
const PUBLICATION_RETAIN_DEFAULT: boolean = true;
const PUBLICATION_META_DEFAULT: boolean = false;
const SUBSCRIPTION_ROOT_DEFAULT: string = 'mqtt.';
const BROKER_RECONNECT_PERIOD = 10;

const PLUGIN_ID: string = 'mqttgw';
const PLUGIN_NAME: string = 'pdjr-skplugin-mqttgw'
const PLUGIN_DESCRIPTION = 'Exchange data with an MQTT server'
const PLUGIN_SCHEMA: object = {
  "type": "object",
  "properties": {
    "brokerUrl": {
      "title": "MQTT broker url (eg: mqtt://192.168.1.203)",
      "type": "string"
    },
    "brokerCredentials": {
      "title": "MQTT client credentials (as 'username:password')",
      "type": "string"
    },
    "rejectUnauthorised": {
      "title": "Reject unauthorised?",
      "type": "boolean"
    },
    "publication": {
      "title": "Publication settings",
      "type": "object",
      "properties": {
        "root": {
          "title": "Prefix to apply to all published topic names",
          "type": "string"
	      },
        "retain": {
          "title": "Default retain setting for published topic data",
          "type": "boolean"
        },
        "interval": {
          "title": "Default minimum interval between topic updates in seconds",
          "type": "number"
        },
        "meta": {
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
  }
};
const PLUGIN_UISCHEMA: object = {};


module.exports = function(app: any) {
  var unsubscribes: (() => void)[] = []
  var pluginConfiguration: PluginConfiguration = <PluginConfiguration>{};
  var mqttClient: MqttClient | undefined = undefined;

  const plugin: SKPlugin = {

    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    description: PLUGIN_DESCRIPTION,
    schema: PLUGIN_SCHEMA,
    uiSchema: PLUGIN_UISCHEMA,

    start: function(options: any) {
      try {
        pluginConfiguration = makePluginConfiguration(options);
        app.debug(`using configuration: ${JSON.stringify(pluginConfiguration, null, 2)}`);
        if ((pluginConfiguration.publicationPaths.length > 0) || (pluginConfiguration.subscriptionTopics.length > 0)) {
          app.setPluginStatus(`Started: publishing ${pluginConfiguration.publicationPaths.length} paths; receiving ${pluginConfiguration.subscriptionTopics.length} topics`);

          mqttClient = operateBrokerInterface(pluginConfiguration);
        } else {
          app.setPluginStatus('Stopped: no configured publication paths or subscription topics');
        }
      } catch(e: any) {
        app.setPluginStatus('Stopped: bad or missing configuration');
        app.setPluginError(e.message);
      } 
    },

    stop: function() {
      if (mqttClient) mqttClient.end();
      unsubscribes.forEach(f => f())
    }
  }

  /**
   * Parse the contents of the plugin configuration file into a fully
   * qualified PluginConfiguration object by interpolating user and
   * system defaults.
   * 
   * Validation errors throw an exception.
   * 
   * @param options plugin configuration options
   * @returns derived PluginConfiguration object
   */
  function makePluginConfiguration(options: any): PluginConfiguration {
    app.debug(`makePluginConfiguration(${JSON.stringify(options)})...`);

    var pluginConfiguration: PluginConfiguration = {
      brokerUrl: (options.brokerUrl || BROKER_URL_DEFAULT),
      brokerCredentials: (options.brokerCredentials || undefined),
      publicationPaths: [],
      subscriptionTopics: []
    }
    if ((options.publication) && (options.publication.paths)) {
      options.publication.paths.forEach((pathOption: any) => {
        if (!pathOption.path) throw('missing publication \'path\' property');
        var publicationPath: PublicationPath = {
          path: pathOption.path,
          topic: `${options.publication.root || PUBLICATION_ROOT_DEFAULT}${(pathOption.topic)?pathOption.topic:(pathOption.path.replaceAll('.','/'))}`,
          interval: (pathOption.interval || options.interval || PUBLICATION_INTERVAL_DEFAULT) * 1000,
          retain: pathOption.retain || options.retain || PUBLICATION_RETAIN_DEFAULT,
          meta: pathOption.meta || options.meta || PUBLICATION_META_DEFAULT
        };
        pluginConfiguration.publicationPaths.push(publicationPath);
      });
    }
    if ((options.subscription) && (options.subscription.topics)) {
      options.subscription.topics.forEach((topicOption: any) => {
        if (!topicOption.topic) throw('missing subscription \'topic\' property');
        var subscriptionTopic: SubscriptionTopic = {
          topic: topicOption.topic,
          path: `${options.subscription.root || SUBSCRIPTION_ROOT_DEFAULT}${(topicOption.path)?topicOption.path:topicOption.topic}`.replace('/','.')
        };
        pluginConfiguration.subscriptionTopics.push(subscriptionTopic);
      });
    }   
    return(pluginConfiguration);
  }

  /**
   * 
   * @param pluginConfiguration fully qualified PluginConfiguration
   * @returns MqttClient handle
   */
  function operateBrokerInterface(pluginConfiguration: PluginConfiguration) : MqttClient {
    app.debug(`operateBrokerInterface(${JSON.stringify(pluginConfiguration)})...`);
    var delta = new Delta(app, plugin.id);

    var mqttClient: MqttClient = connect(
      pluginConfiguration.brokerUrl,
      {
        reconnectPeriod: (BROKER_RECONNECT_PERIOD * 1000),
        clientId: app.selfId,
        username: pluginConfiguration.brokerCredentials.split(':')[0].trim(),
        password: pluginConfiguration.brokerCredentials.split(':')[1].trim()
      }
    );

    mqttClient.on('error', (err) => {
      app.setPluginError(`MQTT broker connection error (${err})`)
    });
      
    mqttClient.on('connect', () => {
      if ((pluginConfiguration.subscriptionTopics) && (pluginConfiguration.subscriptionTopics.length > 0)) {
        app.debug(`subscribing to ${pluginConfiguration.subscriptionTopics.length}`);
        pluginConfiguration.subscriptionTopics.forEach((topic: SubscriptionTopic) => {
          app.debug(`subscribing to topic '${topic.topic}'`);
          mqttClient.subscribe(topic.topic);
        });
      }
      if ((pluginConfiguration.publicationPaths) && (pluginConfiguration.publicationPaths.length > 0)) {
        app.debug(`publishing ${pluginConfiguration.publicationPaths.length} paths`);
        sendPathUpdatesToMqtt(pluginConfiguration.publicationPaths, mqttClient);
      }
      unsubscribes.push(() => mqttClient.end());
    })
      
    mqttClient.on('message', function(topic, message) {
      var subscriptionTopic: SubscriptionTopic = pluginConfiguration.subscriptionTopics.reduce((a: any, t: SubscriptionTopic) => ((t.topic == topic)?t:a), undefined);
      if (subscriptionTopic) {
        var value: string | number = message.toString()
        if (!isNaN(parseFloat(value))) {
          value = parseFloat(value)
        } else if (!isNaN(parseInt(value))) {
          value = parseInt(value);
        }                                                                                        
        app.debug(`received message: '${value}' on topic: '${subscriptionTopic.path}'`);                                                                                                
        delta.addValue(subscriptionTopic.path, value).commit().clear();
      }                                                                                  
    });

    return(mqttClient);
  }

  function sendPathUpdatesToMqtt(publicationPaths: PublicationPath[], client: MqttClient) {
    var value;

    publicationPaths.forEach((path: PublicationPath) => {
      app.debug(`publishing topic '${path.topic}' ${((path.meta)?'and associated meta data':'')}`);

      unsubscribes.push(app.streambundle.getSelfBus(path.path)
        .toProperty()                 // examine values not change events
        .sample(path.interval)        // read value at the configured interval
        .skipDuplicates((a: any, b: any) => (a.value.id)?(a.value.id === b.value.id):(a.value === b.value))
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
       }));
    });
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
  stop: () => void
}

interface PublicationPath {
  path: string,
  topic: string,
  interval: number,
  retain: boolean,
  meta: boolean
}

interface SubscriptionTopic {
  topic: string,
  path: string
}

interface PluginConfiguration {
  brokerUrl: string,
  brokerCredentials: string,
  publicationPaths: PublicationPath[],
  subscriptionTopics: SubscriptionTopic[]
}

