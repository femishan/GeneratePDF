var express = require('express');
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
var routes = require('./routes/index');
var users = require('./routes/users');
var app = express();
var AUTH_TOKEN = '';

//var buffer = new Buffer();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);

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

app.post('/generatepdf', function(req, res) {
  //Read the Template From the Container
  var template_container_name = req.body.templatecontainername;
  var pdf_container_name = req.body.pdfcontainername;
  var template_name = req.body.templatename;
  var pdf_file_Name = req.body.pdffilename;
  var business_data = req.body.businessdata;
  console.log("business_data: "+business_data);
  var fileUploadtime = (new Date).getTime();
   var pdfFileName =  pdf_file_Name+"_"+ fileUploadtime + ".pdf"
   generatepdfdoc(template_container_name, pdf_container_name, template_name, pdfFileName, business_data); 
   console.log("result: "+pdfFileName);
   res.send(pdfFileName);
});
//var temp = '{"patientName":"Jhon Smith","postCode":"MK12 0JK","addressLine1":"71 Barkyby Road","addressLine2":"Leicester","addressLine3":"Leicestershire","contactTelephoneNumbers":"07782348932","medicineListLine1":"medicineNames","medicineListLine2":"medicineListLine2","medicineListLine3":"medicineListLine3","medicineListLine4":"medicineListLine4","medicineListLine5":"medicineListLine5","medicineListLine6":"medicineListLine6","responsiblepersoncollect":"responsiblePersonCollect","responsibleperson":"responsiblePerson","responsiblepersonyesflag":"checked","responsiblepersonnoflag":"No","responsiblepersoncollectyesflag":"checked","responsiblepersoncollectnoflag":"No"}';
//generatepdfdoc('PdfTemplate', 'PdfDocuments','sampletemplate', 'pdf_file_Name', temp); 

function generatepdfdoc(template_container_name, pdf_container_name, template_name, pdf_file_Name, placeholder){ 
    //business_data
    var placeholderJson = JSON.parse(placeholder);
    console.log("placeholder: "+placeholder);
    var objectname = template_name+".html";
    getAuthToken().then(function(token) {
      console.log("API_ENDPOINT: "+API_ENDPOINT); 
         console.log("template_container_name: "+template_container_name); 
         console.log("objectname: "+objectname);
          console.log("token: "+token);
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
              var  bufferString = buffer.toString('base64');
              //console.log('This is a buffer:', Buffer.isBuffer(buffer));           
            //    var fileUploadtime = (new Date).getTime();
             var pdfFileName =  pdf_file_Name;//+"_"+ fileUploadtime + ".pdf"
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
          if(!error && response.statusCode == 201) {         return (pdfFileName);
          } else {        return(error);                   
          } 
      }));
  });
              });
              

            });
     //   return(pdfFileName);
            //  }        
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
  var pdfFileName =  pdf_file_Name;//+"_"+ fileUploadtime + ".pdf"
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
 
module.exports = app;
