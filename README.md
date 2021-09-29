# pdjr-skplugin-mqttgw

Exchange data between MQTT and Signal K.

__pdjr-skplugin_mqttgw__ establishes a client connection to a specified
MQTT server, publishing Signal K path values to MQTT topics and receiving
MQTT messages as Signal K path values.

The configuration file, ```mqttgw.json```

Publications are identified by a Signal K path and optionally mapped to
an equivalent MQTT topic.
If no topic is specified, then dots ('.') in the Signal K path are changed
to slashes ('/') to automatically create a topic name.

Subscriptions are identified by an MQTT topic and optionally mapped to an
equivalent Signal K path.
If no path is specified, then slashes ('/') in topic names replaced by dots
('.') and the values are stored under the 'mqtt.' root.

For example, with no overrides in place:

Publication of 'navigation.position' will update the MQTT topic 'navigation/position'
with a message containing the stringified JSON representation of the Signal K value.

Subscription to the MQTT topic 'switch/wheelhouse_lights' will update the
Signal K path 'mqtt.switch.wheelhouse_lights' with the MQTT message for the
specified topic.


