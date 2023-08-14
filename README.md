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
The <em>broker</em> object has the following properties.
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
The <em>publication</em> object has the following properties.
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
Each *path* object has the following properties.
<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>path</td>
<td>(none)</td>
<td>Signal K path to a value that should be published on the MQTT server. Required.</td>
</tr>
<tr>
<td>topic</td>
<td>(none)</td>
<td>
Topic name to which <em>path</em> should be published.
If <em>topic</em> is not specified, then its value is derived from
<em>path</em> by replacing all periods in <em>path</em> with slashes.
However derived, <em>topic</em> is contatenated to
<em>publication.root</em> to generate an MQTT topic name for
publication.
Optional.
</td>
</tr>
<tr>
<td>retain</td>
<td>(none)</td>
<td>Boolean overriding <em>publication.retainDefault</em>. Optional.</td>
</tr>
<tr>
<td>interval</td>
<td>(none)</td>
<td>Boolean overriding <em>publication.intervalDefault</em>. Optional.</td>
</tr>
<tr>
<td>meta</td>
<td>(none)</td>
<td>Boolean overriding <em>publication.metaDefault</em>. Optional.</td>
</tr>
</table>

Values published to the generated topic name result from applying
JSON.stringify() to the Signal K path value.
If publication of metadata associated with *path* is requested then
such data is published on "<em>topic-name</em>/meta".

The <em>subscription</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topics</td>
<td><pre>[]</pre></td>
<td>Array of <em>topic</em> objects to which the plugin should subscribe. Required.</td>
</tr>
<tr>
<td>root</td>
<td><pre>"mqtt."</pre></td>
<td>Prefix to apply to the Signal K path name of all subscribed <em>topics</em>. Optional.</td>
</tr>
</table>

Each <em>topic</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topic</td>
<td>(none)</td>
<td>Mame of a topic on the MQTT server. Required.</td>
</tr>
<tr>
<td>path</td>
<td>(none)<td>
<td>
Signal K path where data received on <em>topic<em> should be saved. |
If omitted, then all slashes in <em>topic</em> will be replaced by
periods and the result appended to <em>subscription.root</em> to generate a
Signal K path name.
</td>
</tr>
</table>

## Operation

The plugin must be configured to suit local and user requirements
before it can enter production.

## Author

Paul Reeve <*preeve_at_pdjr_eu*>