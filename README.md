# pdjr-skplugin-mqttgw

Exchange data between MQTT and Signal K.

## Description

**pdjr-skplugin-mqttgw** provides a service for exporting data to and
importing data from an MQTT server.

Frequency and scope of export (i.e. whether or not to export metadata
as well as values) and retention behaviour can be set globally and on
a per-item basis.

## Configuration

The plugin recognises the following configuration properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>
broker
</td>
<td><pre>
{
  "url": "mqtt://127.0.0.1",
  "username": "username",
  "password": "password"
}
</pre></td>
<td>
Object supplying connection and authentication details for the MQTT broker. Required.
</td>
</tr>
<tr>
<td>
publication
</td>
<td><pre>
{
  "paths": []
}
</pre></td>
<td>
Specification of Signal K paths that should be published to the broker. Optional.
</td>
</tr>
<tr>
<td>
subscription
</td>
<td><pre>
{
  "topics": [],
}
</pre></td>
<td>
Specification of MQTT topics that should be subscribed to by Signal K. Optional.
</td>
</table>
The broker object has the following properties.
<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>url</td>
<td><pre>"mqtt://127.0.0.1"</pre></td>
<td>Broker url. Required.</td>
</tr>
<tr>
<td>username</td>
<td><pre>"username"</pre></td>
<td>Username for client connection on <em>url</em>. Required.</td>
</tr>
<tr>
<td>password</td>
<td><pre>"password"</pre></td>
<td>Password for <em>username</em> on <em>url</em>. Required.</td>
</tr>
<tr>
<td>rejectUnauthorised</td>
<td><pre>true</pre></td>
<td>Boolean value that does what exactly? Optional.</td>
</tr>
</table>
The publication object has the following properties.
<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>paths</td>
<td><pre>[]</pre></td>
<td>Array of *path* objects, each of which specifies a Signal K path that will be published to the MQTT server. Required.<td>
</tr>
<tr>
<td>root</td>
<td><pre>"signalk/"</pre></td>
<td>Prefix to apply to all published topic names. Optional.</td>
</tr>
<tr>
<td>retainDefault</td>
<td><pre>true</pre></td>
<td>Boolean specifying the default topic retention behaviour. Optional.</td>
</tr>
<tr>
<td>intervalDefault</td>
<td><pre>5</pre></td>
<td>Integer specifying the default publication interval in seconds. Optional.</td>
</tr>
<tr>
<td>metaDefault</td>
<td><pre>false</pre></td>
<td>Boolean specifying whether or not metadata should be published for each published path value. Optional.</td>
</tr>
</table>
  |

publication        | (none)  | Optional object configuring MQTT publication settings for *broker*. |
subscription       | (none)  | Optional object configuring MQTT subscription settings for *broker*. |

The 'broker' object consists of the following properties which define
the connection to an MQTT broker.

Property           | Default | Description |
:----------------- | :------ | :---------- |
url                | (none)  | Required URL of MQTT server (for example, "mqtt://192.168.1.1"). |
username           | (none)  | Required login-id of a user with read and write privileges on the MQTT server at *url* |
password           | (none)  | Required password for *username* on the MQTT server at *url*. |
rejectunauthorised | true    | Optional boolean value that does what exactly? |

The 'publication' object defines the Signal K paths that should be
published on the broker and some default settings for publication.

Property           | Default    | Description |
:----------------- | :--------- | :---------- |
root               | 'signalk/' | Required string prefix to apply to all published topic names. |
paths              | []         | Required list of objects each of which specifies a Signal K path that will be published. |
retaindefault      | true       | Optional boolean specifying the default topic retention type. |
intervaldefault    | 5          | Optional integer specifying the default publication interval in seconds. |
metadefault        | false      | Optional boolean specifying whether or not path meta data should also be published. |

Each item in 'publication.paths' is characterised by the following properties.

Property           | Default | Description |
:----------------- | :------ | :---------- |
path               | (none)  | Required string specifying the Signal K path to a value that should be published on the MQTT server. |
topic              | (none)  | Optional string specifying the topic name to which *path* should be published (see below). |
retain             | (none)  | Optional boolean overriding *publication.retaindefault*. |
interval           | (none)  | Optional integer overriding *publication.intervaldefault*. |
meta               | (none)  | Optional boolean overriding *publication.metadefault*. |

If *topic* is not specified, all periods in *path* will be replaced by
slashes and the result contatenated to *publication.root* to generate a
topic name for publication.

Values published to the generated topic name are generated by applying
JSON.stringify() to the Signal K path value.

If publication of meta data associated with *path* is requested then
it is published on "*topic-name*/meta".

The 'subscription' object defines the topics on the MQTT broker that
should be imported into Signal K together with some default subscription
settings.

Property           | Default | Description |
:----------------- | :------ | :---------- |
root               | 'mqtt.' | Required string prefix to apply to the Signal K path name of all subscribed topics. |
topics             | []      | Required list of objects each of which specifies an MQTT topic and how it should be received into the Signal K data store. |

Each item in *subscription.topics* is characterised by the following properties.

Property           | Default | Description |
:----------------- | :------ | :--- |
topic              | (none)  | Required string specifying the name of a topic on the MQTT server. |
path               | (none)  | Optional string specifying a Signal K path where data received on *topic* should be saved (see below). |

If *path* is left blank, then all slashes in *topic* will be replaced by
periods and the result appended to *subscription.root* to generate a
Signal K path name.

## Operation

The plugin must be configured to suit local and user requirements
before it can enter production. 

## Author

Paul Reeve <*preeve_at_pdjr_eu*>