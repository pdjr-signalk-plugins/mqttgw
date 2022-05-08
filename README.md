# pdjr-skplugin-mqttgw
Exchange data between MQTT and Signal K.

## Description
**pdjr-skplugin-mqttgw** provides a service for both exporting data to
and importing data from a specified  MQTT server using MQTT's standard
publish and subscribe protocols.
The frequency of export can be set on a per-item basis.

## Configuration
The plugin recognises the following configuration properties.

### 'broker' properties

Property           | Description | Default value
------------------ | --- | ---
url                | Required URL of MQTT server (for example, "mqtt://192.168.1.1"). | ''
username           | Optional name of a login user on the MQTT server at *url* | ''
password           | Optional password for *username* on the MQTT server. | ''
rejectunauthorised | Optional boolean value that does what exactly? | true

### 'publication' properties

Property           | Description | Default value
------------------ | --- | ---
root               | Optional string prefix to apply to all published topic names. | 'fromsignalk/'
paths              | Optional list of objects each of which defines a Signal K path and how it should be published to the MQTT server. | []

Each object in *publication.paths* is characterised by the following properties.

Property           | Description | Default value
------------------ | --- | ---
path               | Required string specifying a Signal K path to the value that should be published to the MQTT server. | ''
topic              | Optional string specifying the topic name to which the specified *path* value should be published. If this is left blank, then a topic name will be automatically created by substituting all periods in *path* with slashes. If a value has been supplied for *publication.root*, then this will be prepended to the specified or computed topic name to obtain a finished topic name for publication. | ''
retain             | Optional boolean specifying whether or not the MQTT server should be asked to retain published values. | true
interval           | Optional integer specifying the minimum interval in seconds at which values should be sent to the MQTT server. | 60

### 'subscription' properties

Property           | Description | Default value
------------------ | --- | ---
root               | Optional string prefix to apply to the Signal K path name of all received subscription data. | 'mqtt.'
topics             | Optional list of objects each of which defines an MQTT topic and how it should be received into the Signal K data store. | []

Each object in *subscription.topics* is characterised by the following properties.

Property           | Description | Default value
------------------ | --- | ---
topic              | Required string specifying the name of a topic on the MQTT server to which the plugin should subscribe. | ''
path               | Optional string specifying a Signal K path where data received on *topic* should be saved. If this is left blank, then a Signal K path will be automatically created by substituting all slashes in *topic* with periods. If a value has been supplied for *subscription.root*, then this will be prepended to the specified or computed path to obtain a final Signal K path name.

## Operation

## Messages

### Dashboard status and error messages

### Debug messages

If the host system's DEBUG environment variable contains the value
```pdjr-skplugin-mqttgw``` then the plugin will write every exchanged
data value into Signal K's system log.
