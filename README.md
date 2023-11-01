# pdjr-skplugin-mqttgw

Exchange data between MQTT and Signal K.

## Description

**pdjr-skplugin-mqttgw** exports data to and imports data from an
MQTT server.

Export frequency, scope and retention behaviour can be set globally
and on a per-item basis.

## Configuration

<dl>
  <dt>Broker configuration <code>broker</code></dt>
  <dd>
    Properties which relate to the MQTT peer.
    <dl>
      <dt>MQTT broker URL <code>mqttBrokerUrl</code></dt>
      <dd>
        Optional string property specifying the network location of the
        MQTT broker to which connection should be made.
        Defaults to 'mqtt://127.0.0.1/'.
      </dd>
      <dt>MQTT client credentials <code>mqttClientCredentials</code></dt>
      <dd>
        Optional string property specifying the username and password
        which must be presented by a client connecting to the MQTT
        broker.
        Defaults to 'username:password'.
      </dd>
      <dt>Reject unauthorised? <code>rejectUnauthorised</code></dt>
      <dd>
        Optional boolean which says whether or not to reject TLS/SSL
        connections which fail certificate checks.
        Defaults to true.
      </dd>
    </dl>
  </dd>
  <dt>Publication settings <code>publication</code></dt>
  <dd>
    Optional properties which relate to the publication of Signal K
    data on the MQTT broker.
    <dl>
      <dt>Prefix to apply to all published topic names <code>root</code></dt>
      <dd>
        Optional prefix to apply to all published topic names.
        Defaults to 'signalk/'.
      </dd>
      <dt>Default retain setting for published topic data <code>retainDefault</code></dt>
      <dd>
        Optional boolean specifying the default topic retention behaviour.
        Defaults to true.
      </dd>
      <dt>Default minimum interval between topic updates in seconds <code>intervalDefault</code></dt>
      <dd>
        Defaults to 60.
      </dd>
      <dt>Publish meta data associated with a path <code>metaDefault</code></dt>
      <dd>
      </dd>
      <dt>Signal K self paths which should be published to the remote MQTT server <code></code></dt>
      <dd>
        <dl>
          <dt>Path <code>path</code></dt>
          <dd>
            Required string value specifying a Signal K path that
            references a data value that should be published to the
            MQTT server.
          </dd>
          <dt>Topic name to which path value should be published <code>topic</code></dt>
          <dd>
            Optional string value supplying a topic name to which
            <em>path</em> value will be published.
            Defaults to '<em>root</em>/<em>path</em>' with periods in
            <em>path</em> replaced by slashes.
          </dd>
          <dt>Retain setting for this item (overrides default) <code>retain</code></dt>
          <dd>
          </dd>
          <dt>Publication interval for this item (overrides default) <code>interval</code></dt>
          <dd>
          </dd>
          <dt>Whether or not to publish meta data for this item (overrides default) <code>meta</code></dt>
          <dd>
          </dd>
        </dl>
      </dd>
    </dl>
  </dd>


The <em>publication</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>paths</td>
<td><pre>[]</pre></td>
<td>
Array of <em>path</em> objects (see below), each of which specifies a Signal K path that will be published to the MQTT server.
Required.
<td>
</tr>
<tr>
<td>root</td>
<td><pre>"signalk/"</pre></td>
<td>

</td>
</tr>
<tr>
<td>retainDefault</td>
<td><pre>true</pre></td>
<td>
</td>
</tr>
<tr>
<td>intervalDefault</td>
<td><pre>5</pre></td>
<td>
Integer specifying the default publication interval in seconds.
Optional.
</td>
</tr>
<tr>
<td>metaDefault</td>
<td><pre>false</pre></td>
<td>
Boolean specifying whether or not metadata should be published for each published path value.
Optional.
</td>
</tr>
</table>

Each *path* object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>path</td>
<td>(none)</td>
<td>
Signal K path to a value that should be published on the MQTT server.
Required.
</td>
</tr>
<tr>
<td>topic</td>
<td>(none)</td>
<td>
Topic name to which <em>path</em> should be published.
Optional.
</td>
</tr>
<tr>
<td>retain</td>
<td>(none)</td>
<td>
Boolean overriding <em>publication.retainDefault</em>.
Optional.
</td>
</tr>
<tr>
<td>interval</td>
<td>(none)</td>
<td>
Boolean overriding <em>publication.intervalDefault</em>.
Optional.
</td>
</tr>
<tr>
<td>meta</td>
<td>(none)</td>
<td>
Boolean overriding <em>publication.metaDefault</em>.
Optional.
</td>
</tr>
</table>

The topic name to which a *path* value is published can be specified
explicitly by <em>topic</em>, or, if <em>topic</em> is omitted, it will
be computed by replacing all periods in <em>path</em> with slashes.
However derived, <em>topic</em> is concatenated to
<em>publication.root</em> to generate a final MQTT topic name for
publication.
Values published to the generated topic name result from applying
JSON.stringify() to the value on Signal K <em>path</em>.
If the publication of <em>path</em>'s metadata associated is requested,
then such data is published on "<em>topic-name</em>/meta".

The <em>subscription</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topics</td>
<td><pre>[]</pre></td>
<td>
Array of <em>topic</em> objects (see below) to which the plugin should subscribe.
Required.
</td>
</tr>
<tr>
<td>root</td>
<td><pre>"mqtt."</pre></td>
<td>
Prefix to apply to the Signal K path name of all subscribed <em>topics</em>.
Optional.
</td>
</tr>
</table>

Each <em>topic</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topic</td>
<td>(none)</td>
<td>
Name of a topic on the MQTT server.
Required.
</td>
</tr>
<tr>
<td>path</td>
<td>(none)</td>
<td>
Signal K path where data received on <em>topic<em> should be saved.
Optional.
</td>
</tr>
</table>

If <em>path</em> is omitted, then a value is generated automatically by replacing
all slashes in <em>topic</em> with periods.
A final Signal K path name results from appending the specified or computed path to
<em>subscription.root</em>.

## Operation

The plugin must be configured to suit local and user requirements
before it can enter production.

## Author

Paul Reeve <*preeve_at_pdjr_eu*>
