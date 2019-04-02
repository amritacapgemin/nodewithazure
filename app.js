/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

/**set port using env variable */
var port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", function () {
    console.log("Listening on --- Port 3000");
});


var util = require('util');
//var async = require('async');
var msRestAzure = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var StorageManagementClient = require('azure-arm-storage');
var NetworkManagementClient = require('azure-arm-network');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;


_validateEnvironmentVariables();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var resourceClient, computeClient, storageClient, networkClient;
//Sample Config
var randomIds = {};
var location = 'westus';
var accType = 'Standard_LRS';

// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '14.04.3-LTS';
var osType = 'Linux';
var adminUsername = 'notadmin';
var adminPassword = 'Pa$$w0rd92';

var domainNameLabel = _generateRandomId('testdomainname', randomIds);
var ipConfigName = _generateRandomId('testcrpip', randomIds);

///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////
app.post('/azure', function (req, response) {

    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials, subscriptions) {
        if (err) return console.log(err);
        //console.log(credentials)
        resourceClient = new ResourceManagementClient(credentials, subscriptionId);
        computeClient = new ComputeManagementClient(credentials, subscriptionId);
        storageClient = new StorageManagementClient(credentials, subscriptionId);
        networkClient = new NetworkManagementClient(credentials, subscriptionId);
		 response.setHeader('Content-Type', 'application/json');
		
        switch (req.body.queryResult.intent.displayName) {
           case "createresourceonazure":	
				var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
                createResourceGroup(resourceGroupName, function (err, result) {
                    if (err) {
                        console.log("error in creating resource acocount ");
						response.send(JSON.stringify({ "fulfillmentText": "Error in creating resource group" }));
                    } else {
						console.log("hiii", result.name);
                        response.send(JSON.stringify({ "fulfillmentText": "Resource group is created successfully with name " +result.name}));
                    }
                }); 
				break;		
			case "createstorageaccount":
				response.setHeader('Content-Type', 'application/json');			
				var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
				var getstorageAccountName = req.body.queryResult.parameters.storageaccountname;
				var storageAccountName = getstorageAccountName.toString();
				createStorageAccount(storageAccountName,resourceGroupName, function (err, storageacc) {
                    if (err) {
						 console.log("error in creating storage acocount", err);
                       response.send(JSON.stringify({ "fulfillmentText": "Error in creating storage account" }));
                    } else {
						 console.log("Storage accouint is created");
						 response.send(JSON.stringify({ "fulfillmentText": "Storage account is created successfully with name "}));
                          
                    }
					
                }); 
            break;
			case "createvnet":	
				var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
				var getvnetName = req.body.queryResult.parameters.vnetname;
				var vnetName = getvnetName.toString();
				var getsubnetName = req.body.queryResult.parameters.subnetname;
                var subnetName = getsubnetName.toString();
                createVnet(resourceGroupName, vnetName, subnetName, function (err, vnetInfo) {
                    if (err) {
                        response.send(JSON.stringify({ "fulfillmentText": "Error in creating virtual network" }));
                    } else {
                        console.log("Vnet is created",vnetInfo );
						response.send(JSON.stringify({ "fulfillmentText": "Vitual network is created successfully with name " +vnetInfo.name }));
                    }
                });
                break;
			case "createpublicip":
                var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
				var getPublicipName = req.body.queryResult.parameters.publicipname;
                var publicIPName = getPublicipName.toString();
                createPublicIP(resourceGroupName,publicIPName, function (err, publicIPInfo) {
                    if (err) {
                        console.log("error in creating publicip");
						 response.send(JSON.stringify({ "fulfillmentText": "Error in creating public ip" }));
                    } else {
                        console.log("PublicIp is created" + util.inspect(publicIPInfo, { depth: null }));
						response.send(JSON.stringify({ "fulfillmentText": "Public Ip is created successfully with name " +publicIPInfo.name }));
                    }
                });
                break;
			case "getSubnetInfo":
                var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
				var getvnetName = req.body.queryResult.parameters.vnetname;
                var vnetName = getvnetName.toString();
				var getsubnetName = req.body.queryResult.parameters.subnetname;
                var subnetName = getsubnetName.toString();
                getSubnetInfo(resourceGroupName,vnetName,subnetName, function (err, subnetInfo) {
                    if (err) {
                        response.send(JSON.stringify({ "fulfillmentText": "To get subnetinfo" }));
                    } else {
                        console.log('\nFound subnet:\n' + util.inspect(subnetInfo, { depth: null }));
						response.send(JSON.stringify({ "fulfillmentText": "Subnet name is  " +publicIPInfo.name }));
                    }
                });
                break;
			case "findVMImage":
				findVMImage(function (err, vmImageInfo) {
                    if (err) {
                        console.log("error to fetch vmimage");
                    } else {
                        console.log('\nFound Vm Image:\n' + util.inspect(vmImageInfo, { depth: null }));
						response.send(JSON.stringify({ "fulfillmentText": "Vm image info here: " +vmImageInfo.name+ " and location is " +vmImageInfo.location}));
                    }
                });
                break;
			case "createNIC":
                var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();	
                var getvnetName = req.body.queryResult.parameters.vnetname;
				var vnetName =  getvnetName.toString();
                var getsubnetName = req.body.queryResult.parameters.subnetname;
				var subnetName = getsubnetName.toString();
				
				var getnetworkInterfaceName = req.body.queryResult.parameters.nicname;
				var networkInterfaceName =  getnetworkInterfaceName.toString();
               
                getSubnetInfo(resourceGroupName,vnetName, subnetName, function (err, subnetInfo) {
                    if (err) { console.log("error in info") } else {
                        console.log('\nFound subnet:\n' + util.inspect(subnetInfo, { depth: null }))
                    };
                    createPublicIP(resourceGroupName,publicIPName, function (err, publicIPInfo) {
                        if (err) { console.log("error in info1") } else {
                            console.log('\nCreated public IP:\n' + util.inspect(publicIPInfo, { depth: null }))
                        };
                        createNIC(subnetInfo, publicIPInfo, networkInterfaceName, resourceGroupName, function (err, nicInfo) {
                            console.log("data is here" + subnetInfo + " one " + publicIPInfo + " two " + ipConfigName + " three " + networkInterfaceName + " four " + resourceGroupName)
                            if (err) {
                                console.log("error in info2")
                            } else {
                                console.log('\nCreated Network Interface:\n' + util.inspect(nicInfo, { depth: null }))
                            };
                        });
                    });
                });
                break;
        }
    });
});
/**Function to create resource group name*/
function createResourceGroup(resourceGroupName, callback) {
    var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
    console.log('\n1.Creating resource group: ' + resourceGroupName);
    return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}
/**Function to create storage account name*/
function createStorageAccount(storageAccountName, resourceGroupName, callback) {
    console.log('\n2.Creating storage account: ' + storageAccountName);
    var createParameters = {
        location: location,
        sku: {
            name: accType,
        },
        kind: 'Storage',
        tags: {
            tag1: 'val1',
            tag2: 'val2'
        }
    };
    return storageClient.storageAccounts.create(resourceGroupName, storageAccountName, createParameters, callback);
}
/**Function to create virtual network*/
function createVnet(resourceGroupName, vnetName, subnetName, callback) {
    var vnetParameters = {
        location: location,
        addressSpace: {
            addressPrefixes: ['10.0.0.0/16']
        },
        dhcpOptions: {
            dnsServers: ['10.1.1.1', '10.1.2.4']
        },
        subnets: [{ name: subnetName, addressPrefix: '10.0.0.0/24' }],
    };
    console.log('\n3.Creating vnet: ' + vnetName);
    return networkClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnetParameters, callback);
}
/**Function to create public Ip*/
function createPublicIP(resourceGroupName, publicIPName, callback) {
    var publicIPParameters = {
        location: location,
        publicIPAllocationMethod: 'Dynamic',
        dnsSettings: {
            domainNameLabel: domainNameLabel
        }
    };
    console.log('\n4.Creating public IP: ' + publicIPName);
    return networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters, callback);
}
/**Function to getting subnet info*/
function getSubnetInfo(resourceGroupName,vnetName,subnetName, callback) {
    console.log('\nGetting subnet info for: ' + subnetName);
    return networkClient.subnets.get(resourceGroupName, vnetName, subnetName, callback);
}
/**Function to find vmimage*/
function findVMImage(callback) {
    console.log(util.format('\nFinding a VM Image for location %s from ' +
        'publisher %s with offer %s and sku %s', location, publisher, offer, sku));
    return computeClient.virtualMachineImages.list(location, publisher, offer, sku, { top: 1 }, callback);
}
/**Function to create network interface*/
function createNIC(subnetInfo,publicIPInfo,networkInterfaceName,resourceGroupName, callback) {
    var nicParameters = {
        location: location,
        ipConfigurations: [
            {
                name: ipConfigName,
                privateIPAllocationMethod: 'Dynamic',
                subnet: subnetInfo,
                publicIPAddress: publicIPInfo
            }
        ]
    };
    console.log('\n5.Creating Network Interface: ' + networkInterfaceName);
    return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
}


/**Function to set env variabel*/
function _validateEnvironmentVariables() {
    var envs = [];
    if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
    if (!process.env['DOMAIN']) envs.push('DOMAIN');
    if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
    if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
    if (envs.length > 0) {
        throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
    }
}

function _generateRandomId(prefix, exsitIds) {
    var newNumber;
    while (true) {
        newNumber = prefix + Math.floor(Math.random() * 10000);
        if (!exsitIds || !(newNumber in exsitIds)) {
            break;
        }
    }
    return newNumber;
}