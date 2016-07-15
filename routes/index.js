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
var AUTH_TOKEN = '';
//var credentials = require('./credentials')['Object-Storage'][0].credentials;


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
config.tenantId = 'e79a24a0bc3f4b1cb274aa7a10580fc6';
// userId as provided in your Service Credentials
config.userId = '63802cdb791a4c5da294c9c2f4d806aa';
// username as provided in your Service Credentials
config.username = 'admin_f897572c81146424b0c15a1510c9f309bc35dc75';
// password as provided in your Service Credentials
config.password = 'aGv.^t2?j36t&bYH';
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
                "id": "63802cdb791a4c5da294c9c2f4d806aa", //userId
                "password": "aGv.^t2?j36t&bYH" //userPassword
            }
        }
    },
    "scope": {
        "project": {
            "id": "e79a24a0bc3f4b1cb274aa7a10580fc6" //projectId
        }
    }
};
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
    return AUTH_TOKEN;
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/generatepdf', function(req, res,next) {
	 res.send('respond with a resource');
});

router.post('/generatepdf/:container_name/:template_name', function(req, res) {
  //Read the Template From the Container
  var container_name = req.params.container_name;
  var object_name = req.params.template_name + ".html";
  getAuthToken().then(function(token) {
    request({
      url: API_ENDPOINT + '/' + container_name + '/' + object_name,
      method: 'get',
      headers: {
        'X-Auth-Token': token
      }
    }, function(error, response, body) {
      if(!error && response.statusCode === 200) {
       createPDF(body);
       res.send(body);
      } else {
       res.send(error);
      }
    })
  });
 });
//function to create and store PDF
function createPDF(templateHtml){
  // var templateHtml =  fs.readFileSync("C:/apps/generatepdf/views/sampletemplate.html", 'utf8');
          templateHtml = replace(templateHtml,'{{patientName}}', 'Jhon Smith');
          templateHtml = replace(templateHtml,"{{postCode}}", "MK12 0JK");
          templateHtml = replace(templateHtml,"{{addressLine1}}", "71 Barkyby Road");
          templateHtml = replace(templateHtml,"{{addressLine2}}", "");
          templateHtml = replace(templateHtml,"{{addressLine3}}","");
          templateHtml = replace(templateHtml,"{{contactTelephoneNumbers}}", "082348932");
          templateHtml = replace(templateHtml,"{{medicineListLine1}}", "params.medicineNames");
          templateHtml = replace(templateHtml,"{{medicineListLine2}}", "params.medicineListLine2");
          templateHtml = replace(templateHtml,"{{medicineListLine3}}", "params.medicineListLine3");
          templateHtml = replace(templateHtml,"{{medicineListLine4}}", "params.medicineListLine4");
          templateHtml = replace(templateHtml,"{{medicineListLine5}}", "params.medicineListLine5");
          templateHtml = replace(templateHtml,"{{medicineListLine6}}", "params.medicineListLine6");

          templateHtml = replace(templateHtml,"{{responsiblePersonCollect}}", "params.responsiblePersonCollect");
          templateHtml = replace(templateHtml,"{{responsiblePerson}}", "params.responsiblePerson");
          var responsiblePersonYesFlag = true;
          if(responsiblePersonYesFlag) {
          templateHtml = replace(templateHtml,"{{responsiblePersonYesFlag}}", "checked");
          templateHtml = replace(templateHtml,"{{responsiblePersonNoFlag}}", "");
          } else {
          templateHtml = replace(templateHtml,"{{responsiblePersonNoFlag}}", "checked");
          templateHtml = replace(templateHtml,"{{responsiblePersonYesFlag}}", "");
          }
          var responsiblePersonCollectYesFlag = true;
           if(responsiblePersonCollectYesFlag) {
          templateHtml = replace(templateHtml,"{{responsiblePersonCollectYesFlag}}", "checked");
          templateHtml = replace(templateHtml,"{{responsiblePersonCollectNoFlag}}", "");
          } else {
          templateHtml = replace(templateHtml,"{{responsiblePersonCollectNoFlag}}", "checked");
          templateHtml = replace(templateHtml,"{{responsiblePersonCollectYesFlag}}", "");
          }
          var options = {
          width: '200mm',
          height: '300mm'
          }

          //store PDF
          var promise = new Promise(function(resolve, reject) {
          var fileUploadtime = (new Date).getTime();
          var pdfFileName =  "PdfDocument_" + fileUploadtime + ".pdf"
          var documentType = pdf;
          var fileContext = "";
          var fileName = pdfFileName;
          var container_name = "PdfTemplate";

          //var base64File = 
          // create PDF   
          pdf.create(templateHtml).toBuffer(function(err, buffer){
           // buffer = Buffer.isBuffer(buffer);        
            console.log (buffer);

             getAuthToken().then(function(token) {
                  getStringAsStream(buffer).pipe(Base64.decode()).pipe(request({
                    url: API_ENDPOINT + '/' + container_name + '/' + pdfFileName,
                    method: 'put',
                    headers: {
                      'X-Auth-Token': token,
                      'Content-Type': 'application/pdf',
                      // 'Content-Length': bytes, TODO: work out content length of Base64
                      'X-Object-Meta-FileContext': fileContext,
                      'X-Object-Meta-DocumentType': documentType
                    }
                  }, function(error, response, body) {
                    if(!error && response.statusCode == 201) {
                      console.log(JSON.stringify({status: 'success'}));
                    } else {
                      console.log(error, body);
                      console.log(body);
                    }
                  }));
                });
           });

   });

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
