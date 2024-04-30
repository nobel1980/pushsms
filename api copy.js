const express = require('express');
const oracledb = require('oracledb');
const axios = require('axios');
const cron = require('node-cron');

const app = express();

oracledb.initOracleClient({libDir: 'C:\\instantclient_21_3'});

// Oracle database connection configuration
const dbConfig = {
  user: 'DIGITALPR',
  password: 'DIGITALPR',
  connectString: '172.30.0.45:1521/FAR23DB'
};

// Configure the Oracle database connection pool
oracledb.createPool(dbConfig)
  .then(pool => {
    console.log('Oracle Database connection pool created');

    // Schedule the task to run every 1 minute
    cron.schedule('* * * * *', () => {
      fetchDataFromDatabase(pool);
    });
  })
  .catch(error => {
    console.error('Error creating Oracle Database connection pool:', error);
  });

// Function to fetch data from the Oracle database and send it to the remote server
function fetchDataFromDatabase(pool) {
  pool.getConnection()
    .then(connection => {
      connection.execute(
        //`SELECT * FROM  SMS.SMSPUSH WHERE ROWNUM <= 5 ORDER BY DATA_ID`,
        `SELECT REFNO, LPAD(MOBILE, 13, '88') AS MOBILE, MSG  FROM  SMS.SMSPUSH WHERE STATUS = 'PROCESSING' AND ROWNUM <=2`,

        //`SELECT REFNO, LPAD(MOBILE, 13, '88') AS MOBILE, MSG  FROM  SMS.SMSPUSH WHERE RECPTNO = '79'`,
        
        //`SELECT * FROM POLICY.IDRA_UMP_POLICY_PUSH WHERE DATA_SEND_STATUS = 'PROCESSING' AND ROWNUM <=2`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
        .then(result => {
           const data = result.rows;
             
           const updatedData = data.map(obj => {
            const username = "FAREAST";
            const password = "F$res#L1f&6754";  
            const apicode = 5;
            const countrycode = 880;
            const cli = "FAREASTLIFE";
            const messagetype = 1;
            //const msisdn =[];

            const timestamp = generateTimestamp();
            const randomString = generateRandomString(4); // Example random string

            const bill_msisdn = 8801969965555;
            const tran_type ="T";
            const request_type="S";
            const rn_code=91;
            return {
              username:username,
              password:password,
              apicode:apicode,
              countrycode:countrycode,
              cli:cli,
              messagetype:messagetype,
              msisdn:[obj.MOBILE],
              message:obj.MSG,
              clientId: timestamp + randomString,
              bill_msisdn:bill_msisdn,
              tran_type:tran_type,
              request_type:request_type,
              rn_code:rn_code
            };
          });

          const json = JSON.stringify(updatedData);

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
            "clienttransid": "FAR1709683371",
            "bill_msisdn": "8801969965555",
            "tran_type": "T",
            "request_type": "S",
            "rn_code": "91"
           };

          // Send the data to the remote server
          sendDataToRemoteServer(json)
            .then(response => {
              //console.log(response.headers);
              console.log(response.data);
              console.log(response.status);
              // console.log(response.statusText);
              // console.log(response.headers);
              // console.log(response.config);
              // Update the response in the SMSPUSH table
              //updateResponseInDatabase(connection, data, response);
            })
            .catch(error => {
              console.error('Error sending data to remote server:', error);
            });
        })
        .catch(error => {
          console.error('Error executing SQL query:', error);
        })
        .finally(() => {
          connection.close();
        });
    })
    .catch(error => {
      console.error('Error getting database connection:', error);
    });
}

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

app.listen(3000, () => {
  console.log('API server is running on port 3000');
});