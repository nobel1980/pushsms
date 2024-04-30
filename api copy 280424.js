const express = require('express');
const oracledb = require('oracledb');
const axios = require('axios');
const cron = require('node-cron');

// Remote server endpoint
const remoteServerUrl = 'https://corpsms.banglalink.net/bl/api/v1/smsapigw/';
const headers = {
  'Content-Type': 'application/json'
}


const app = express();

oracledb.initOracleClient({libDir: 'C:\\instantclient_21_3'});

// Oracle database connection configuration
const dbConfig = {
  user: 'DIGITALPR',
  password: 'DIGITALPR',
  connectString: '172.30.0.45:1521/FAR23DB'
};

// Schedule the task to run every 1 minute
cron.schedule('* * * * *', async () => {
  try {
    // Get JSON data from Oracle database table
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT RECPTNO, LPAD(MOBILE, 13, '88') AS MOBILE, MSG  FROM  SMS.SMSPUSH WHERE STATUS = 'PROCESSING' AND ROWNUM <=1`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const data = result.rows;
    console.log(data);
    exit;
    const rows = data.map(obj => {
      const username = "FAREAST";
      const password = "F$res#L1f&6754";  
      const apicode = "5";
      const countrycode = "880";
      const cli = "FAREASTLIFE";
      const messagetype = "1";
      //const msisdn =[];

      const timestamp = generateTimestamp();
      const randomString = generateRandomString(4); // Example random string

      const bill_msisdn = 8801969965555;
      const tran_type = "T";
      const request_type = "S";
      const rn_code= "91";
      return {
        username:username,
        password:password,
        apicode:apicode,
        msisdn:[obj.MOBILE],
        countrycode:countrycode,
        cli:cli,
        messagetype:messagetype,  
        message:obj.MSG,
        //clienttransid: timestamp + randomString,
        clienttransid: obj.RECPTNO,
        bill_msisdn:bill_msisdn,
        tran_type:tran_type,
        request_type:request_type,
        rn_code:rn_code
      };
    });

    // Process and send data one by one to remote server
    for (const row of rows) {
      //const jsonData = convertRowToJson(row);
      //const jsonData = JSON.stringify(row);
      const jsonData = JSON.stringify(row, null, 2);

      console.log(jsonData);

      const data1 = {
        "username": "FAREAST",
        "password": "F$res#L1f&6754",
        "apicode": "5",
        "msisdn": [
        "8801771241037"
        ],
        "countrycode": "880",
        "cli": "FAREASTLIFE",
        "messagetype": "1",
        "message": "Test SMS from Banglalink API by Shahidul ",
        "clienttransid": "FAR1709183371",
        "bill_msisdn": "8801969965555",
        "tran_type": "T",
        "request_type": "S",
        "rn_code": "91"
       };


      const response = await axios.post(remoteServerUrl, jsonData, {
        headers: headers
      });

      // const response = await axios.post(remoteServerUrl, jsonData, {
      //   headers: headers
      // })
      // .then((response) => {
      //   dispatch({
      //     type: FOUND_USER,
      //     data: response.data[0]
      //   })
      // })
      // .catch((error) => {
      //   dispatch({
      //     type: ERROR_FINDING_USER
      //   })
      // })

      console.log(response.data);
      console.log(response.data.statusInfo.clienttransid);
      const responseData = response.data;
      const clienttransid = response.data.statusInfo.clienttransid;

      // const responseData = "Success";
      // const clienttransid = '79LG24042103';

      //exit();
      // Update response into the Oracle database table
      // Assuming you have a column named 'response' in your_table
      const result = await connection.execute(
        `UPDATE SMS.SMSPUSH 
         SET RESPONSE = :responseData 
         WHERE RECPTNO = :clienttransid`,
        {
          responseData: JSON.stringify(responseData),
          clienttransid: clienttransid
        },
        {
          autoCommit: true
        }
      );
    }

    // Release the Oracle database connection
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
});

// Converts a single row to JSON
function convertRowToJson(row) {
  const json = {};
  for (let i = 0; i < row.length; i++) {
    json[result.metaData[i].name] = row[i];
  }
  return json;
}

// Start the Express server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});

//function generate timestamp
function generateTimestamp(){
  let timestamp = Math.floor(Date.now() / 1000); // Unix time
  return hexTimestamp = timestamp.toString(16);
  //return hexUpperTimestamp = hexTimestamp.toUpperCase();
}

//function generate string
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}


// Function to send data to the remote server
function sendDataToRemoteServer(data) {
  // ogic to send data to the BL remote server using axios 
  return axios.post('https://corpsms.banglalink.net/bl/api/v1/smsapigw/', data );
}

async function sendDataToServer(data) {
  for (const [key, value] of data) {
    try {
      const response = await axios.post('https://corpsms.banglalink.net/bl/api/v1/smsapigw/', value);
      console.log(`Data sent: ${key}: ${JSON.stringify(value)}`);
      console.log(`Server response: ${response.data}`);
    } catch (error) {
      console.error(`Error sending data: ${error.message}`);
    }
  }
}

// Function to update the response in the SMSPUSH table
function updateResponseInDatabase(connection, data, response) {
  const updatePromises = data.map(row => {
    return connection.execute(
      `UPDATE SMSPUSH SET RESPONSE = :response WHERE DATA_ID = :dataId`,
      { response: response.data, dataId: row.DATA_ID }
    );
  });

  Promise.all(updatePromises)
    .then(() => {
      console.log('Response updated in database');
    })
    .catch(error => {
      console.error('Error updating response in database:', error);
    });
}
