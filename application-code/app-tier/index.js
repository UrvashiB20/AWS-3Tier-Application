const {
    SecretsManagerClient,
    GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const os = require('os');
const fetch = require('node-fetch');

const app = express();
const port = 4000;

async function loadDatabaseSecrets() {
    const client = new SecretsManagerClient({
        region: 'ap-south-1'
    });

    const command = new GetSecretValueCommand({
        SecretId: 'aws-3tier/rds/application'
    });

    const response = await client.send(command);

    if (!response.SecretString) {
        throw new Error('SecretString was not returned from Secrets Manager');
    }

    const secrets = JSON.parse(response.SecretString);

    const requiredKeys = [
        'DB_HOST',
        'DB_USER',
        'DB_PWD',
        'DB_DATABASE'
    ];

    for (const key of requiredKeys) {
        if (!secrets[key]) {
            throw new Error(`Missing ${key} in Secrets Manager secret`);
        }
    }

    process.env.DB_HOST = secrets.DB_HOST;
    process.env.DB_USER = secrets.DB_USER;
    process.env.DB_PWD = secrets.DB_PWD;
    process.env.DB_DATABASE = secrets.DB_DATABASE;

    console.log('Database configuration loaded from AWS Secrets Manager');
}

async function startApplication() {

    await loadDatabaseSecrets();

    // IMPORTANT:
    // TransactionService is required only AFTER the secrets
    // have been loaded into process.env.
    const transactionService = require('./TransactionService');

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(cors());

    // HEALTH CHECK
    app.get('/health', (req, res) => {
        res.json("This is the health check");
    });

    // ADD TRANSACTION
    app.post('/transaction', (req, res) => {
        var response = "";
        try {
            console.log(req.body);
            console.log(req.body.amount);
            console.log(req.body.desc);

            var success = transactionService.addTransaction(
                req.body.amount,
                req.body.desc
            );

            if (success = 200) {
                res.json({
                    message: 'added transaction successfully'
                });
            }
        } catch (err) {
            res.json({
                message: 'something went wrong',
                error: err.message
            });
        }
    });

    // GET ALL TRANSACTIONS
    app.get('/transaction', (req, res) => {
        try {
            var transactionList = [];

            transactionService.getAllTransactions(function (results) {

                console.log("we are in the call back:");

                for (const row of results) {
                    transactionList.push({
                        "id": row.id,
                        "amount": row.amount,
                        "description": row.description
                    });
                }

                console.log(transactionList);

                res.statusCode = 200;
                res.json({
                    "result": transactionList
                });
            });

        } catch (err) {
            res.json({
                message: "could not get all transactions",
                error: err.message
            });
        }
    });

    // DELETE ALL TRANSACTIONS
    app.delete('/transaction', (req, res) => {
        try {
            transactionService.deleteAllTransactions(function(result) {
                res.statusCode = 200;
                res.json({
                    message: "delete function execution finished."
                });
            });
        } catch (err) {
            res.json({
                message: "Deleting all transactions may have failed.",
                error: err.message
            });
        }
    });

    // DELETE ONE TRANSACTION
    app.delete('/transaction/id', (req, res) => {
        try {
            transactionService.deleteTransactionById(
                req.body.id,
                function(result) {
                    res.statusCode = 200;
                    res.json({
                        message: `transaction with id ${req.body.id} seemingly deleted`
                    });
                }
            );
        } catch (err) {
            res.json({
                message: "error deleting transaction",
                error: err.message
            });
        }
    });

    // GET SINGLE TRANSACTION
    app.get('/transaction/id', (req, res) => {
        try {
            transactionService.findTransactionById(
                req.body.id,
                function(result) {

                    res.statusCode = 200;

                    var id = result[0].id;
                    var amt = result[0].amount;
                    var desc = result[0].desc;

                    res.json({
                        "id": id,
                        "amount": amt,
                        "desc": desc
                    });
                }
            );

        } catch (err) {
            res.json({
                message: "error retrieving transaction",
                error: err.message
            });
        }
    });

    app.listen(port, () => {
        console.log(`AB3 backend app listening at http://localhost:${port}`);
    });
}

startApplication().catch((err) => {
    console.error('Application startup failed:', err);
    process.exit(1);
});
