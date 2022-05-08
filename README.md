# pdjr-skplugin-mqttgw
Exchange data between MQTT and Signal K

## Description
**pdjr-skplugin-mqttgw** provides mechanisms for both exporting
data to and importing data from a specified  MQTT server.
The frequency of update of exported data items can be set on a
per-item basis.

## Configuration

The plugin recognises the following configuration properties.

### Remote and local server configuration

Property           | Description | Default value
------------------ | --- | ---
remotehost         | URL of MQTT server. | 'mqtt://myhost.net/'
username           | Name of a valid user on *remotehost*. | ''
password           | Password of *username* on *remotehost*. | ''
rejectUnauthorised |
subscriptionroot   |

## Operation

## Messages

### Dashboard status and error messages

### Debug messages

If the host system's DEBUG environment variable contains the value
```pdjr-skplugin-mqttgw``` then the plugin will write every
exchanged data value into Signal K's system log.
