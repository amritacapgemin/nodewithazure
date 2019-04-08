/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

var util = require('util');
var async = require('async');
var msRestAzure = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var StorageManagementClient = require('azure-arm-storage');
var NetworkManagementClient = require('azure-arm-network');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;


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


_validateEnvironmentVariables();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
console.log(clientId);
console.log(secret);
var resourceClient, computeClient, storageClient, networkClient;
//Sample Config
var randomIds = {};
var location = 'westus';
var accType = 'Standard_LRS';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var vmName = _generateRandomId('testvm', randomIds);
var storageAccountName = _generateRandomId('testac', randomIds);
var vnetName = _generateRandomId('testvnet', randomIds);
var subnetName = _generateRandomId('testsubnet', randomIds);
var publicIPName = _generateRandomId('testpip', randomIds);
var networkInterfaceName = _generateRandomId('testnic', randomIds);
var ipConfigName = _generateRandomId('testcrpip', randomIds);
var domainNameLabel = _generateRandomId('testdomainname', randomIds);
var osDiskName = _generateRandomId('testosdisk', randomIds);

// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '14.04.3-LTS';
var osType = 'Linux';

// Windows config
//var publisher = 'microsoftwindowsserver';
//var offer = 'windowsserver';
//var sku = '2012-r2-datacenter';
//var osType = 'Windows';

var adminUsername = 'notadmin';
var adminPassword = 'Pa$$w0rd92';


///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////
app.post('/azure', function (req, response) {
	 switch (req.body.queryResult.intent.displayName) {	
case "test":
msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials, subscriptions) {
  if (err) return console.log(err);
  //console.log(credentials)
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  computeClient = new ComputeManagementClient(credentials, subscriptionId);
  storageClient = new StorageManagementClient(credentials, subscriptionId);
  networkClient = new NetworkManagementClient(credentials, subscriptionId);

  async.series([
    function (callback) {
      ///////////////////////////////////////////////////////////////////////////////////
      //Task1: Create VM. This is a fairly complex task. Hence we have a wrapper method//
      //named createVM() that encapsulates the steps to create a VM. Other tasks are   //
      //fairly simple in comparison. Hence we don't have a wrapper method for them.    //
      ///////////////////////////////////////////////////////////////////////////////////
      console.log('\n>>>>>>>Start of Task1: Create a VM named: ' + vmName);
      createVM(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error in Task1: while creating a VM:\n%s',
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          console.log(util.format('\n######End of Task1: Create a VM is succesful.\n%s',
            util.inspect(result, { depth: null })));
			 response.send(JSON.stringify({ "fulfillmentText": "Storage account is created successfully with name "}));
          callback(null, result);
        }
      });
    },
   
  ],
    //final callback to be run after all the tasks
    function (err, results) {
      if (err) {
        console.log(util.format('\n??????Error occurred in one of the operations.\n%s',
          util.inspect(err, { depth: null })));
      } else {
        console.log(util.format('\n######All the operations have completed successfully. ' +
          'The final set of results are as follows:\n%s', util.inspect(results, { depth: null })));
        console.log(util.format('\n\n-->Please execute the following script for cleanup:\nnode cleanup.js %s %s', resourceGroupName, vmName));
      }
      return;
    });
});
break;
	 }
});

function createVM(finalCallback) {
  //We could have had an async.series over here as well. However, we chose to nest
  //the callbacks to showacase a different pattern in the sample.
  createResourceGroup(function (err, result) {
    if (err) return finalCallback(err);
    createStorageAccount(function (err, accountInfo) {
      if (err) return finalCallback(err);

    });
  });
}

function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
  console.log('\n1.Creating resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function createStorageAccount(callback) {
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