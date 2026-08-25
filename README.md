# 3-Tier Application Deployment Using AWS Services

A manually deployed 3-tier web application running on AWS using native
AWS services.

The final implementation uses a React frontend, a Node.js/Express
backend, Amazon RDS for MySQL, Amazon S3 for application artifacts, an
Application Load Balancer, a private EC2 application server, AWS Secrets
Manager, IAM, AWS Systems Manager Session Manager, and VPC networking.

------------------------------------------------------------------------

## 1. Project Overview

This project demonstrates how a web application can be deployed manually
on AWS using a secure three-tier architecture.

The deployment was performed manually using AWS services and Linux
configuration. The setup does not use DevOps tools (like Jenkins, Docker, or Kubernetes) and relies on AWS native services for hosting, networking, and storage.

The application provides a simple transaction database demo where Users can:

-   View transaction records
-   Add a transaction with an amount and description
-   Delete transaction records
-   Retrieve transaction data through the backend API

The application was accessed successfully through the public Application
Load Balancer DNS name, while the application EC2 instance and RDS
database remained private.

------------------------------------------------------------------------

## 2. Final Architecture

``` text
                                INTERNET
                                    |
                                    v
                    +-----------------------------+
                    | Application Load Balancer   |
                    | aws-3tier-alb               |
                    | Internet-facing             |
                    | Public Subnet AZ-1 & AZ-2   |
                    +-------------+---------------+
                                  |
                              HTTP : 80
                                  |
                                  v
                    +-----------------------------+
                    | Target Group                |
                    | aws-3tier-tg                |
                    | 1 healthy EC2 target       |
                    +-------------+---------------+
                                  |
                                  v
                    +-----------------------------+
                    | Private EC2                 |
                    | t3.micro                    |
                    | Nginx                       |
                    | React production build      |
                    | Node.js                     |
                    +-------------+---------------+
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                       ▼                     ▼
             ┌─────────────────┐    ┌─────────────────┐
             │   RDS MySQL     │    │       S3        │
             │ Private Subnet  │    │ Application Code│
             └─────────────────┘    └─────────────────┘
                      ▲                     ▲
                      │                     │
                      │              S3 VPC Endpoint
                      │
               Secrets Manager
                      ▲
                      │
                IAM EC2 Role

Supporting AWS services:

Private EC2
   |
   +---- AWS Secrets Manager
   |
   +---- Amazon S3 through S3 Gateway VPC Endpoint
   |
   +---- AWS Systems Manager Session Manager

Private subnet outbound traffic
   |
   +---- NAT Gateway
```

### Traffic flow

``` text
Browser
  |
  v
Internet-facing ALB
  |
  v
Target Group
  |
  v
Private EC2
  |
  +--> Nginx --> React frontend
  |
  +--> /api/* --> Node.js / Express
                         |
                         v
                    RDS MySQL
```

------------------------------------------------------------------------

## 3. Technologies

**Application**

-   React
-   Node.js
-   Nginx
-   MySQL

**AWS**

-   Amazon VPC
-   EC2
-   Application Load Balancer
-   Amazon RDS for MySQL
-   Amazon S3
-   AWS Secrets Manager
-   AWS IAM
-   AWS Systems Manager
-   NAT Gateway
-   Internet Gateway
-   VPC Route Tables
-   VPC Gateway Endpoint
-   Security Groups
------------------------------------------------------------------------

## 4. AWS Services Used

| AWS Service | Purpose |
|------|-------|
| Amazon VPC  | Isolated network for the application |
| Public Subnets | Host the internet-facing ALB |
| Private Application Subnet | Hosts the EC2 application server |
| Private Database Subnets | Provide the RDS DB subnet group |
| Internet Gateway | Internet connectivity for public subnets |
| NAT Gateway | Outbound internet access from the private application subnet |
| Route Tables | Control subnet traffic routing |
| Application Load Balancer | Public entry point and traffic distribution |
| EC2 | Runs Nginx and the Node.js application |
| Amazon RDS for MySQL | Persistent application database |
| Amazon S3 | Stores application artifacts |
| S3 Gateway VPC Endpoint | Private S3 access from the VPC |
| AWS Secrets Manager | Stores database credentials |
| IAM | Controls AWS permissions for the EC2 instance |
| AWS Systems Manager Session Manager | Secure administration access to the private EC2 instance |

------------------------------------------------------------------------

## 5. Network Design

The project uses a custom VPC:

``` text
VPC
10.0.0.0/16
```

The network is divided into public and private subnets across
Availability Zones.

### Public layer

The public subnets are used by the internet-facing Application Load Balancer.

``` text
Internet
   |
Internet Gateway
   |
Public Subnet AZ-1
Public Subnet AZ-2
   |
Application Load Balancer
```

### Private application layer

The Node.js application server is deployed in a private subnet.

The EC2 instance does not have a public IPv4 address.

The ALB is the public entry point and forwards HTTP traffic to the EC2
target.

### Private database layer

Amazon RDS for MySQL is deployed privately and is not exposed directly
to the internet.

The RDS security group allows MySQL traffic only from the EC2 security
group.

------------------------------------------------------------------------

## 6. Security Architecture

The security groups enforce the following traffic path:

``` text
Internet
   |
   | HTTP :80
   v
ALB Security Group
   |
   | HTTP :80
   v
EC2 Security Group
   |
   | MySQL :3306
   v
RDS Security Group
```

### ALB Security Group

Allows HTTP traffic from the internet on port 80.

### EC2 Security Group

Allows HTTP traffic only from the ALB security group.

The EC2 instance is not directly exposed to the internet.

### RDS Security Group

Allows MySQL traffic on port 3306 only from the EC2 security group.

This prevents direct public access to the database.

------------------------------------------------------------------------

## 7. Application Stack

### Frontend

-   React
-   Production build served by Nginx

### Backend

-   Node.js
-   Express
-   REST-style API
-   Application listens internally on port 4000

### Reverse Proxy

-   Nginx
-   Listens on port 80
-   Serves the React production build
-   Proxies `/api/` requests to the Node.js application

### Database

-   Amazon RDS for MySQL
-   Port 3306
-   Private connectivity from EC2

------------------------------------------------------------------------

## 8. Application Flow

The frontend communicates with the backend using the `/api/transaction`
endpoint.

### Read transactions

``` text
GET /api/transaction
```

The backend retrieves transaction records from MySQL and returns them to
the React frontend.

### Add transaction

``` text
POST /api/transaction
```

Example request:

``` json
{
  "amount": "500",
  "desc": "Sample transaction"
}
```

The backend inserts the transaction into MySQL.

### Delete transactions

``` text
DELETE /api/transaction
```

The backend removes the transaction records and the frontend refreshes
the displayed data.

------------------------------------------------------------------------

## 9. S3 Integration

Amazon S3 is used to store application artifacts.

The Amazon S3 bucket stores the application code used for deployment to the EC2 application environment.

The private EC2 instance accesses S3 through an S3 Gateway VPC Endpoint
rather than requiring public access to S3.

This allows the private application server to retrieve application
artifacts while keeping the traffic inside the AWS network.

------------------------------------------------------------------------

## 10. Secrets Manager Integration

Database credentials are stored in AWS Secrets Manager rather than in a
committed `.env` file.

The EC2 instance uses its IAM role to retrieve the secret.

Application startup loads the database configuration from AWS Secrets
Manager.

This avoids storing database credentials directly in the source code or
Git repository.

------------------------------------------------------------------------

## 11. IAM

The EC2 instance uses an IAM role to access required AWS services.

The role provides permissions required for:

-   AWS Systems Manager Session Manager
-   Reading application artifacts from S3
-   Writing required application artifacts to S3
-   Reading the database secret from AWS Secrets Manager

Permissions are assigned through IAM policies rather than embedding AWS
access keys inside the application.

------------------------------------------------------------------------

## 12. AWS Systems Manager Session Manager

The EC2 instance is private and does not require a public IP address for
administrative access.

AWS Systems Manager Session Manager was used to connect to the EC2
instance.

This allowed administration without exposing SSH directly to the
internet.

------------------------------------------------------------------------

## 13. Nginx and Node.js Flow

Inside the private EC2 instance:

``` text
Client
  |
  v
ALB
  |
  v
Nginx :80
  |
  +----------------------+
  |                      |
  v                      v
React Build          /api/*
                         |
                         v
                  Node.js :4000
                         |
                         v
                     RDS MySQL
```

The Node.js service was configured to run as an operating-system
service.

The application was verified to be listening on:

``` text
localhost:4000
```

------------------------------------------------------------------------

## 14 Application Verification

The deployment was verified at multiple levels.

### ALB

-   Application Load Balancer was active
-   Internet-facing
-   Deployed across two Availability Zones
-   HTTP listener on port 80
-   Forwarding traffic to the target group

### Target Group

-   EC2 registered as the target
-   Target health check passed
-   One healthy target was confirmed

### EC2

-   Private EC2 instance
-   No public IPv4 address
-   Nginx running
-   Node.js application running on port 4000

### Database

-   RDS MySQL instance running privately
-   Application successfully connected to the database
-   Database records were successfully read and written

### End-to-end test

The application was successfully accessed through the ALB DNS name and
the transaction functionality was tested.

A POST request was also tested through the application API and
successfully created a transaction record.

------------------------------------------------------------------------

## 15. Repository Structure

A recommended repository structure is:

``` text
aws-3tier-application/
│
├── application-code/
│   ├── app-tier/
│   │   ├── DbConfig.js
│   │   ├── TransactionService.js
│   │   └── index.js
|   |   └── package-lock.json
|   |   └── package.json
│   │
│   └── web-tier/
│       ├── public/
│       ├── src/
│       ├── package.json
│       └── package-lock.json
│
├── screenshots/
│   ├── vpc/
│   ├── networking/
│   ├── security/
│   ├── alb/
│   ├── ec2/
│   ├── rds/
│   ├── s3/
│   ├── secrets-manager/
│   ├── ssm/
│   └── application/
│
└── README.md
```

The screenshots are stored under a `screenshots/` directory.

------------------------------------------------------------------------

## 16. Screenshots

The `screenshots/` directory contains evidence of the actual AWS
resources and application testing performed during the deployment.

The screenshots cover areas including:

-   VPC
-   Subnets
-   Route tables
-   Internet Gateway
-   NAT Gateway
-   Security Groups
-   IAM
-   S3
-   S3 VPC Endpoint
-   Secrets Manager
-   Systems Manager Session Manager
-   EC2
-   Application Load Balancer
-   ALB listener
-   Target Group health
-   RDS
-   Database connectivity
-   Application/API testing

These screenshots document the deployed environment before the AWS
resources are removed.

------------------------------------------------------------------------

## 17. Final Result

The completed deployment demonstrates:

``` text
Internet
   ↓
Application Load Balancer
   ↓
Private EC2
   ↓
Nginx
   ↓
React + Node.js
   ↓
Private RDS MySQL
```

with AWS-native supporting services:

``` text
S3
Secrets Manager
IAM
SSM Session Manager
VPC
NAT Gateway
S3 Gateway VPC Endpoint
Security Groups
Route Tables
```

The application was deployed manually, tested end-to-end, and documented
with AWS console screenshots.

------------------------------------------------------------------------

## 18. Conclusion

This project successfully implemented and verified a secure three-tier web application architecture on AWS.

The project covered VPC networking, public and private subnets, route tables, Internet Gateway, NAT Gateway, Application Load Balancer, Target Group, private EC2, Amazon RDS, Amazon S3, AWS Secrets Manager, IAM, S3 VPC Endpoint, Security Groups, and AWS Systems Manager Session Manager.

The application was successfully accessed through the Application Load Balancer DNS name, while the EC2 application server and RDS database remained private. Application functionality and database connectivity were verified through end-to-end testing.

The project provided practical experience in manually designing, deploying, securing, testing, and documenting an AWS three-tier application using AWS-native services.
