var express = require('express');
var router = express.Router();
var cfenv = require('cfenv');
var request = require('request');
var Promise = require('bluebird');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var pdf = require('html-pdf');
var jsonParser = bodyParser.json();
var Base64 = require('base64-stream');
var stream = require('stream');
var app = express();

//var pdfFileName =  "PdfDocument_" + fileUploadtime + ".pdf"
var AUTH_TOKEN = '';
// var credentials = require('./credentials')['Object-Storage'][0].credentials; 

// Create a config object
var config = {};
// Specify Openstack as the provider
config.provider = "openstack";
// Authentication url
config.authUrl = 'https://lon-identity.open.softlayer.com/';
config.region= 'london';
// Use the service catalog
config.useServiceCatalog = true;
// true for applications running inside Bluemix, otherwise false
config.useInternal = true;
// projectId as provided in your Service Credentials
config.tenantId = 'e02bdfeae6734f479cfc433fca4d91d0';
// userId as provided in your Service Credentials
config.userId = 'c1caef7b03d84e95b49257f645750355';
// username as provided in your Service Credentials
config.username = 'admin_fd3162f4b7886af79f1c4920047e662e9510d2d8';
// password as provided in your Service Credentials
config.password = 'e5ryFv/7Yf^9O}&H';
var API_ENDPOINT = ['https://lon.objectstorage.open.softlayer.com/v1/AUTH_', config.tenantId].join('');

config.auth = {
    forceUri  : "https://lon-identity.open.softlayer.com/v3/auth/tokens",  
    interfaceName : "public", 
    "identity": {
        "methods": [
            "password"
        ],
        "password": {
            "user": {
                "id": "c1caef7b03d84e95b49257f645750355", //userId
                "password": "e5ryFv/7Yf^9O}&H" //userPassword
            }
        }
    },
    "scope": {
        "project": {
            "id": "e02bdfeae6734f479cfc433fca4d91d0" //projectId
        }
    }
};
//console.log("config: " + JSON.stringify(config));
var getAuthToken = function() {
  if(AUTH_TOKEN === '') {
    return new Promise(function(resolve, reject) {
      var authUrl = config.authUrl;
      var authInfo = {
        auth: {
          identity: {
            methods: ['password'],
            password: {
              user: {
                id: config.userId,
                password: config.password
              }
            }
          },
          scope: {
            project: {
              id: config.tenantId
            }
          }
        }
      }
      request(
        {
          url: authUrl + '/v3/auth/tokens',
          method: 'post',
          body: authInfo,
          json: true
        }, function(error, response, body) {
          if(error)
            reject(error);
          else {
            resolve(response.headers['x-subject-token']);
          }
      });
    });
  } else {
    console.log("AUTH_TOKEN"+AUTH_TOKEN);
    return AUTH_TOKEN;

  }
}


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/*router.get('/generatepdf', function(req, res,next) {
	 res.send('respond with a resource');
});*/

router.post('/storedocument', function(req, res) {

  var base64File = req.body.documentBase64;
  var documentType = req.body.documentType;
  var fileContext = req.body.context;
  var pdfFileName = req.body.fileName;
  var reference = req.body.reference;
  var brokerId = req.body.brokerId;
  var customerId = req.body.customerId;
  var digitalRefId = req.body.digitalRefId;
  var brokerUserId = req.body.brokerUserId;
  var isUploaded = req.body.isUploaded;
  var uploadedBy = req.body.uploadedBy;
  var uploadedDate = req.body.uploadedDate;
  var fileUploadtime = (new Date).getTime();
  var pdfFileName =  pdf_file_Name+"_"+ fileUploadtime + ".pdf"
  var containername = req.params.containername;

  getAuthToken().then(function(token) {
    getStringAsStream(base64File).pipe(Base64.decode()).pipe(request({
      url: API_ENDPOINT + '/' + containername + '/' + pdfFileName,
      method: 'put',
      headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/pdf',
          'X-Object-Meta-FileContext': fileContext,                  
          'X-Object-Meta-DocumentId': pdfFileName,
          'X-Object-Meta-DocumentType': 'pdf',
          'X-Object-Meta-Reference': reference,
          'X-Object-Meta-BrokerId': brokerId,
          'X-Object-Meta-CustomerId': customerId,
          'X-Object-Meta-DigitalReferenceId': digitalRefId,
          'X-Object-Meta-BrokerUserId': brokerUserId,
          'X-Object-Meta-IsUploaded': isUploaded,
          'X-Object-Meta-UploadedBy': uploadedBy,
          'X-Object-Meta-DocumentType': uploadedDate
      }
    }, function(error, response, body) {
      if(!error && response.statusCode == 201) {
        res.send(response.headers);
      } else {
        console.log(error, body);
        res.send(body);
      }
    }));
  });
});
router.get('/getpdfbyId', function(req, res) {
   var pdfContainerName = req.headers.pdfcontainername;
  var pdfFileName = req.headers.pdffilename;
//var container_name = "SecciDocuments";
  getAuthToken().then(function(token) {
    console.log(token);
    request({
      url: API_ENDPOINT + '/' + pdfContainerName + '/'+pdfFileName,
      method: 'get',
      headers: {
        'X-Auth-Token': token
      }
    }, function (error, response, body) {
        // OpenStack API returns a 201 to indicate success
        if (!error ) {
          res.send(body);
        }
    })
  });
});

router.get('/getpdfmetadata', function(req, res) {
   var pdfContainerName = req.headers.pdfcontainername;
  var pdfFileName = req.headers.pdffilename;
//var container_name = "SecciDocuments";
  getAuthToken().then(function(token) {
    console.log(token);
    request({
      url: API_ENDPOINT + '/' + pdfContainerName + '/'+pdfFileName,
      method: 'head',
      headers: {
        'X-Auth-Token': token
      }
    }, function (error, response, body) {
        // OpenStack API returns a 201 to indicate success
        if (!error ) {
          res.send(response.headers);
        }
    })
  });
});

router.get('/getpdfListbyMetadata', function(req, res) {
  var container_name = req.headers.pdfcontainername;
  var metaData = req.headers.metadata;
  getAuthToken().then(function(token) {
      request({
        url: API_ENDPOINT + '/' + container_name,
        method: 'get',
        headers: {
          'X-Auth-Token': token
        }
      }, function(error, response, body) {
        if(!error && response.statusCode === 200) {     
            var patt1 = /\n/;
            var pdfList = body.split(patt1);
            var details;
           for (var i=0; i < pdfList.length; i++) {       
              var url = API_ENDPOINT + '/'+ container_name +'/'+ pdfList[i];
              console.log(url);
              getMetadataResponse(url, token, metaData, function(err, body) {
                if (err) {
                 return(err);
                } else {
                  console.log(details);
                }
              });
              console.log(details);
            }
          } else {
             console.log(error);
          }
      })
   })
});
function getMetadataResponse(url, token, pdfList, callback) {    

    request({
      url: API_ENDPOINT + '/SecciDocuments/Sample_1469118745382.pdf', 
    // method: 'head',   
      headers: {
        'X-Auth-Token': token        
      }
    }, function (error, response, body) {
    if (error || response.statusCode !== 200) {
      return callback(error || {statusCode: response.statusCode});
    }
    callback(null, response.headers);  
    });
}
//router.get('/generatepdf/:templatecontainername/:templatename/:pdfcontainername/:pdffilename', function(req, res) {
  router.post('/generatepdf', function(req, res) {
  //Read the Template From the Container
  var templateContainerName = req.body.templatecontainername;
  var pdfContainerName = req.body.pdfcontainername;
  var templateName = req.body.templatename;
  var pdfFileName = req.body.pdffilename;
  var businessData = req.body.businessdata;
  var reference = req.body.reference;
  var brokerId = req.body.brokerId;
  var customerId = req.body.customerId;
  var digitalRefId = req.body.digitalRefId;
  var brokerUserId = req.body.brokerUserId;
  var isUploaded = req.body.isUploaded;
  var uploadedBy = req.body.uploadedBy;
  var uploadedDate = req.body.uploadedDate;
  console.log("business_data: "+businessData);
  var fileUploadtime = (new Date).getTime();
  var pdfFileName =  pdfFileName+"_"+ fileUploadtime + ".pdf"
  generatepdfdoc(templateContainerName, pdfContainerName, templateName, pdfFileName, businessData,reference, brokerId, customerId, digitalRefId, brokerUserId, isUploaded, uploadedBy, uploadedDate); 
  console.log("result: "+pdfFileName);
  res.send(pdfFileName);
});

function generatepdfdoc(template_container_name, pdf_container_name, template_name, pdf_file_Name, placeholder,reference, brokerId, customerId, digitalRefId, brokerUserId, isUploaded, uploadedBy, uploadedDate){ 
    //business_data
    var placeholderJson = JSON.parse(placeholder);
    console.log("placeholderJson: "+ placeholder);
    console.log(placeholderJson);
    var objectname = template_name+".html";
    console.log("template_name:"+template_name);
    getAuthToken().then(function(token) {
      request({
        url: API_ENDPOINT + '/' + template_container_name + '/' +objectname ,
        method: 'get',
        headers: {
          'X-Auth-Token': token
        }
      }, function(error, response, body) {
        if(!error && response.statusCode === 200) {
            for(var key in placeholderJson) {
              var tempKey = '{{'+key+'}}';
              var tempValue = placeholderJson[key];
              body = replace(body,tempKey, tempValue);   
               //console.log(body);
            }
            var promise = new Promise(function(resolve, reject) {
              pdf.create(body).toBuffer(function(err, buffer){ 
             // console.log('This is a buffer:', Buffer.isBuffer(buffer));
              var  bufferString = buffer.toString('base64');           
              var fileUploadtime = (new Date).getTime();
              var pdfFileName =  pdf_file_Name; //+"_"+ fileUploadtime + ".pdf"
              var documentType = pdf;
              var fileContext = "";

    getAuthToken().then(function(token) {
      getStringAsStream(bufferString).pipe(Base64.decode()).pipe(request({
        url: API_ENDPOINT + '/' + pdf_container_name + '/' + pdfFileName,
        method: 'put',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/pdf',
          'X-Object-Meta-FileContext': fileContext,
          'X-Object-Meta-DocumentType': 'pdf',
          'X-Object-Meta-Reference': reference,
          'X-Object-Meta-BrokerId': brokerId,
          'X-Object-Meta-CustomerId': customerId,
          'X-Object-Meta-DigitalReferenceId': digitalRefId,
          'X-Object-Meta-BrokerUserId': brokerUserId,
          'X-Object-Meta-IsUploaded': isUploaded,
          'X-Object-Meta-UploadedBy': uploadedBy,
          'X-Object-Meta-DocumentType': uploadedDate
        }
      }, function(error, response, body) {
          if(!error && response.statusCode == 201) {         
            return (pdfFileName);
          } else {        return(error);                   
          } 
      }));
  });
              });
              

            });
            //  }    
             //return (pdfFileName);    
        } else {
          console.log(error);
         return(error);
        }
      });
    });
}


  
function  convertPDF(doc){
  //store PDF
  var promise = new Promise(function(resolve, reject) {
  pdf.create(templateHtml).toBuffer(function(err, buffer){
   if (err) {
       console.log(err);
       reject("error there!" + err);
    } else {
       console.log(res);
       resolve(buffer);
    }
  });
  });     
  return promise;
}

function storePDF(pdfDoc, pdf_container_name, pdf_file_Name ){
  var fileUploadtime = (new Date).getTime();
  var pdfFileName =  pdf_file_Name+"_"+ fileUploadtime + ".pdf"
  var documentType = pdf;
  var fileContext = "";
    getAuthToken().then(function(token) {
      getStringAsStream(buffer).pipe(Base64.decode()).pipe(request({
        url: API_ENDPOINT + '/' + pdf_container_name + '/' + pdfFileName,
        method: 'put',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/pdf',
          'X-Object-Meta-FileContext': fileContext,
          'X-Object-Meta-DocumentType': documentType
        }
      }, function(error, response, body) {
          if(!error && response.statusCode == 201) {         return (pdfFileName);
          } else {        return(error);                   
          } 
      }));
  });
}


router.get('/container/:container_name/object/:object_name', function(req, res) {
  var container_name = req.params.container_name;
  var object_name = req.params.object_name;

  getAuthToken().then(function(token) {
    request({
      url: API_ENDPOINT + '/' + container_name + '/' + object_name,
      method: 'get',
      headers: {
        'X-Auth-Token': token
      }
    }, function(error, response, body) {
      if(!error && response.statusCode === 200) {
        res.setHeader('X-Object-Meta-FileContext',
        response.headers['X-Object-Meta-FileContext']);

        res.setHeader('X-Object-Meta-DocumentType',
        response.headers['X-Object-Meta-DocumentType']);

        res.end(body);
      } else {
        res.end(error);
      }
    })
  });
})

function generateDoc(placeholderJson, templateHtml) {
  var placeholderJson = JSON.parse(placeholderJson);
  for(var key in placeholderJson) {
    var tempKey = '{{'+key+'}}';
    var tempValue = placeholderJson[key];
    console.log("tempKey: " + tempKey+" tempValue: "+ tempValue);
    templateHtml = replace(templateHtml,tempKey, tempValue);
   // templateHtml = templateHtml.replace(tempKey,tempValue);     
  }
  return (templateHtml);
}

var options = {
 width: '200mm',
 height: '300mm'
}

 function replace(template,orginalString,replaceText) {
    if(replaceText)
      template = template.replace(orginalString, replaceText);
    else
      template = template.replace(orginalString, "");
    return template
  }
  
var getStringAsStream = function(string) {
  var s = new stream.Readable();
  s._read = function noop() {};
  s.push(string);
  s.push(null);
  return s;
}
 



module.exports = router;
