package org.openremote.agent.protocol.tradfri.device;

import org.openremote.agent.protocol.tradfri.util.CoapClient;

/**
 * The class that represents an IKEA TRÅDFRI remote
 */
public class Remote extends Device {

    /**
     * Construct the Remote class
     * @param name The name of the remote
     * @param creationDate The creation date of the remote
     * @param instanceId The instance id of the remote
     * @param deviceInfo The information of the device
     * @param coapClient A CoAP client that can be used to communicate with the plug using the IKEA TRÅDFRI gateway
     */
    public Remote(String name, Long creationDate, Integer instanceId, DeviceInfo deviceInfo, CoapClient coapClient){
        super(name, creationDate, instanceId, deviceInfo, coapClient);
    }

}
