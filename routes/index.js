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
var fileUploadtime = (new Date).getTime();
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
config.tenantId = '50830c200bd64fa7b71ee2aa102f8ac6';
// userId as provided in your Service Credentials
config.userId = '32711e214dfd4ce494109a37587209c7';
// username as provided in your Service Credentials
config.username = 'admin_cd4eec0a7d8a07bd81cb9e18bae340ed89fb3ef4';
// password as provided in your Service Credentials
config.password = 'T!diyH!2lyW2]]S4';
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
                "id": "32711e214dfd4ce494109a37587209c7", //userId
                "password": "T!diyH!2lyW2]]S4" //userPassword
            }
        }
    },
    "scope": {
        "project": {
            "id": "50830c200bd64fa7b71ee2aa102f8ac6" //projectId
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

//router.get('/generatepdf/:templatecontainername/:templatename/:pdfcontainername/:pdffilename', function(req, res) {
  router.post('/generatepdf', function(req, res) {
  //Read the Template From the Container
  var template_container_name = req.body.templatecontainername;
  var pdf_container_name = req.body.pdfcontainername;
  var template_name = req.body.templatename;
  var pdf_file_Name = req.body.pdffilename;
  var business_data = req.body.businessdata;
   var pdfFileName =  pdf_file_Name+"_"+ fileUploadtime + ".pdf"
   generatepdfdoc(template_container_name, pdf_container_name, template_name, pdfFileName, business_data); 
   console.log("result: "+pdf_container_name+" / "+pdfFileName);
   res.send(pdfFileName);
});

function generatepdfdoc(template_container_name, pdf_container_name, template_name, pdf_file_Name, placeholder ){ 
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
               console.log(body);
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
          'X-Object-Meta-DocumentType': documentType
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


app.get('/container/:container_name/object/:object_name', function(req, res) {
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
