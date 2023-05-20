# pdjr-skplugin-mqttgw
Exchange data between MQTT and Signal K.

## Background

## Description
**pdjr-skplugin-mqttgw** provides a service for both exporting data to
and importing data from a specified MQTT server.

Frequency of export and retention behaviour can be set globally and on
a per-item basis.

If you are unfamiliar with MQTT then consult this [MQTT documentation](https://mqtt.org).

## Configuration

The plugin recognises the following configuration properties.

Property           | Default | Description |
:----------------- | :------ | :---------- |
broker             | (none)  | Object supplying connection configuration data for the MQTT broker. |
publication        | (none)  | Object supplying a ist of Signal K paths to be published on *broker*. |
subscription       | (none)  | Object supplying a list of topics on *broker* that should be imported into Signal K. |

The 'broker' object consists of the following properties which define
the connection to an MQTT broker.

Property           | Default | Description |
:----------------- | :------ | :---------- |
url                | (none)  | Required URL of MQTT server (for example, "mqtt://192.168.1.1"). |
username           | (none)  | Optional login id of a user with read and write privileges on the MQTT server at *url* |
password           | (none)  | Optional password for *username* on the MQTT server. |
rejectunauthorised | (none)  | Optional boolean value that does what exactly? | true |

The 'publication' object defines the Signal K paths that should be
published on the broker and some default settings for publication.

Property           | Default | Description |
:----------------- | :------ | :---------- |
root               | 'signalk/' | Optional string prefix to apply to all published topic names. |
retaindefault      | true       | Optional boolean specifying the default topic retention type. |
intervaldefault    | 5          | Optional integer specifying the default publication interval in seconds. |
paths              | []         | Optional list of objects each of which specifies a Signal K path and any publication overrides. |

Each item in 'publication.path' is characterised by the following properties.

Property           | Default | Description |
:----------------- | :------ | :---------- |
path               | (none)  | Required string specifying the Signal K path to a value that should be published on the MQTT server. |
topic              | (none)  | Optional string specifying the topic name to which *path* should be published (see below). |
retain             | (none)  | Optional boolean overriding *publication.retaindefault*. |
interval           | (none)  | Optional integer overriding *publication.intervaldefault*. |

If *topic* is not specified, all periods in *path* will be replaced by
slashes and the result contatenated to *publication.root* to generate a
topic name for publication.

The 'subscription' object defines the topics on the MQTT broker that
should be imported into Signal K together with some default subscription
settings.

Property           | Default | Description |
:----------------- | :------ | :---------- |
root               | 'mqtt.' | Optional string prefix to apply to the Signal K path name of all subscribed topics. |
topics             | []      | Optional list of objects each of which specifies an MQTT topic and how it should be received into the Signal K data store. |

Each item in *subscription.topics* is characterised by the following properties.

Property           | Default | Description |
:----------------- | :------ | :--- |
topic              | (none)  | Required string specifying the name of a topic on the MQTT server. |
path               | (none)  | Optional string specifying a Signal K path where data received on *topic* should be saved (see below). |

If *path* is left blank, then all slashes in *topic* will be replaced by
periods and the result appended to *subscription.root* to generate a
Signal K path name.

## Operation

The plugin starts automatically on install and writes a pro-forma
plugin configuration file to disk.
This file must be edited to suit local and user requirements before
the plugin can enter production. 

## Author

Paul Reeve <*preeve_at_pdjr_eu*>