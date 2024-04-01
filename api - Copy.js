const express = require('express');
const oracledb = require('oracledb');
const axios = require('axios');
const cron = require('node-cron');

const app = express();

oracledb.initOracleClient({libDir: 'C:\\instantclient_21_3'});

// Oracle database connection configuration
const dbConfig = {
  user: 'SYUSR',
  password: 'FILSYU$01',
  connectString: '172.30.0.41:1521/POLICY'
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
        `SELECT * FROM  POLICY.IDRA_UMP_POLICY_PUSH WHERE ROWNUM <= 5 ORDER BY DATA_ID`,
        //`SELECT * FROM POLICY.IDRA_UMP_POLICY_PUSH WHERE DATA_SEND_STATUS = 'PROCESSING'`
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
        .then(result => {
          const data = result.rows;

          // Obtain access token from the remote server
          getAccessToken()
            .then(token => {
              // Send the data to the remote server
              sendDataToRemoteServer(data, token)
                .then(response => {
                  // Update the response in the SMSPUSH table
                  updateResponseInDatabase(connection, data, response);
                })
                .catch(error => {
                  console.error('Error sending data to remote server:', error);
                });
            })
            .catch(error => {
              console.error('Error obtaining access token:', error);
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

// Function to obtain access token from the remote server
function getAccessToken() {
  const user = 'your-username';
  const password = 'your-password';

  // Your logic to obtain the access token from the remote server using user and password
  return axios.post('https://remote-server-url.com/login', { user, password })
    .then(response => response.data.access_token);
}

// Function to send data to the remote server
function sendDataToRemoteServer(data, token) {
  // Your logic to send data to the remote server using axios and access token
  return axios.post('https://remote-server-url.com/data', { data }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
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