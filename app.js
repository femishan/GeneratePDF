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
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);
/*
var getAuthToken = function() {
  if(AUTH_TOKEN === '') {
    return new Promise(function(resolve, reject) {
      var authUrl = credentials['auth_url'];
      var authInfo = {
        auth: {
          identity: {
            methods: ['password'],
            password: {
              user: {
                id: credentials.userId,
                password: credentials.password
              }
            }
          },
          scope: {
            project: {
              id: credentials.projectId
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
}*/

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
    //console.log("AUTH_TOKEN"+AUTH_TOKEN);
    return AUTH_TOKEN;

  }
}

app.post('/generatepdf', function(req, res) {
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
  var fileUploadtime = (new Date).getTime();
  var pdfFileName =  pdf_file_Name+"_"+ fileUploadtime + ".pdf"
  generatepdfdoc(templateContainerName, pdfContainerName, templateName, pdfFileName, businessData,reference, brokerId, customerId, digitalRefId, brokerUserId, isUploaded, uploadedBy, uploadedDate); 
  res.send(pdfFileName);
});

var fileUploadtime = (new Date).getTime()
var pdf_file_Name =  "Sample_"+ fileUploadtime + ".pdf"
var temp = '{"creditorName":"Secure Trust Bank", "tradingAs":"V12 Retail Finance","creditorAddress":"One Arleston Way,Sloihull,West Midlands,B90 4LH","creditIntermediaryName":"Edinburgh Bicycle Co-Operative Limited","creditIntermediaryAddress":"8 Alvanley Terrace,Whitehouse Loan,Edinburgh","creditType":"Fixed sum loan Agreement", "creditAmount":"&euro; 360.00", "duration":"duration", "CompanyRegistrationNumber":"541132", "FinancialServicesRegisterNumber":"204550","telephone":"08000234567","email":"complaint.info@financial-ombudsman.org.uk", "website":"www.prolifics.com"}';
//'{"patientName":"Jhon Smith","postCode":"MK12 0JK","addressLine1":"71 Barkyby Road","addressLine2":"Leicester","addressLine3":"Leicestershire","contactTelephoneNumbers":"07782348932","medicineListLine1":"medicineNames","medicineListLine2":"medicineListLine2","medicineListLine3":"medicineListLine3","medicineListLine4":"medicineListLine4","medicineListLine5":"medicineListLine5","medicineListLine6":"medicineListLine6","responsiblepersoncollect":"responsiblePersonCollect","responsibleperson":"responsiblePerson","responsiblepersonyesflag":"checked","responsiblepersonnoflag":"No","responsiblepersoncollectyesflag":"checked","responsiblepersoncollectnoflag":"No"}';
//generatepdfdoc('PdfTemplate', 'SecciDocuments','secciTemplate', pdf_file_Name, temp, 'ref123456', 'broker001', 'customer001', 'digitalRef001', 'brokerUserJhon', 'true', 'Femina Shan', '1March2016', 'res'); 
//app.post('/GetPDFMetaData', function(req, res) {
   var pdfContainerName = "SecciDocuments";//req.body.pdfcontainername;
  var pdfFileName = "SecciPdf_1469180593478.pdf";//req.body.pdffilename;
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
           console.log(response.headers);
          //res.send(response.headers);
        }
    })
  });
//});

function generatepdfdoc(template_container_name, pdf_container_name, template_name, pdf_file_Name, placeholder,reference, brokerId, customerId, digitalRefId, brokerUserId, isUploaded, uploadedBy, uploadedDate){ 
    //business_data
    var placeholderJson = JSON.parse(placeholder);
    var objectname = template_name+".html";
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
              // console.log(body);
            }
            var promise = new Promise(function(resolve, reject) {
              pdf.create(body).toBuffer(function(err, buffer){ 
                //pdf.create(body, options).toFile('SampleSecci.pdf',function(err, res) {
              var  bufferString = buffer.toString('base64');
              console.log(bufferString);
             var pdfFileName =  pdf_file_Name;
              var documentType = pdf;
              var fileContext = "";
                getAuthToken().then(function(token) {
        getStringAsStream(bufferString).pipe(Base64.decode()).pipe(request({
        // user Story 15: ref, brokerId, customerId, digitalRefId, brokerUserId, isUploaded, uploadedBy, uploadedDate
        url: API_ENDPOINT + '/' + pdf_container_name + '/' + pdfFileName,
        method: 'put',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/pdf',
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
             
           //console.log(response);
           return (response);
          } else {        
            return(error);                   
          } 
      }));
  });
              });
              

            });
     //   return(pdfFileName);
            //  }        
        } else {
         // console.log(error);
         return(error);
        }
      });
    });
}
 

 app.post('/storedocument', function(req, res) {

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

function  convertPDF(doc){
  //store PDF
  var promise = new Promise(function(resolve, reject) {
  pdf.create(templateHtml).toBuffer(function(err, buffer){
   if (err) {
       //console.log(err);
       reject("error there!" + err);
    } else {
       //console.log(res);
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

app.get('/getpdfListbyMetadata', function(req, res) {
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
              //console.log(url);
              getMetadataResponse(url, token, metaData, function(err, body) {
                if (err) {
                 return(err);
                } else {
                  res.send(details);
                }
              });
              res.send(details);
            }
          } else {
             res.send(error);
          }
      })
   })
});

app.get('/getpdfmetadata', function(req, res) {
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

app.get('/getpdfbyId', function(req, res) {
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
          res.send(response.headers);
        }
    })
  });
});

/*getAuthToken().then(function(token) {
    console.log(token);
    request({
      url: API_ENDPOINT + '/SecciDocuments/Sample_1469118745382.pdf?x-object-meta-digitalreferenceid=digitalRefId8989', 
      method: 'get',
      headers: {
        'X-Auth-Token': token
      }
    }, function (error, response, body) {
        // OpenStack API returns a 201 to indicate success
        if (!error ) {
          console.log(body);
        }
    })
  });*/
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
 
module.exports = app;
