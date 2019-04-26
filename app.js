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
 /* 
var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Example app listening at http://%s:%s", host, port)
})*/

/**pass incoming webhook to send messege to slack */
var MY_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";
var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);


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

console.log( "client",clientId);
console.log("secreat",secret);
console.log("domain",domain);
console.log("subc",subscriptionId);
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
var osDiskName = _generateRandomId('testosdisk', randomIds);


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
		
		console.log("Display name ", req.body.queryResult.intent.displayName);
		
        switch (req.body.queryResult.intent.displayName) {			
			case "createresourceonazure":	
				var getResourceName = req.body.queryResult.parameters.resourcename;
                var resourceGroupName = getResourceName.toString();
                createResourceGroup(resourceGroupName, function (err, result) {
                    if (err) {
                        console.log("error in creating resource group",err);
						response.send(JSON.stringify({ "fulfillmentText": "Error in creating resource group" }));
                    } else {
						console.log("Here is result", result.name);
                        //response.send(JSON.stringify({ "fulfillmentText": "Resource group is created successfully with name " +result.name}));						
					slack.send({				  
						channel: 'azure',
						text:  'Resource group is created with name '+result.name		
					}); 

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
							slack.send({				  
								channel: 'azure',
								text:  "Error in creating Storage account"
						   });  
						   //response.send(JSON.stringify({ "fulfillmentText": "Error in creating storage account" }));
						} else {
							 console.log("Storage accouint is created",storageacc );
							 //response.send(JSON.stringify({ "fulfillmentText": "Storage account is created successfully with name "}));
						slack.send({				  
							channel: 'azure',
							text:  'Storage account is created with name '+storageacc.name	
						});                         
						}
						
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