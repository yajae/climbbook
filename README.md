# ClimbPartner

![Node.js](https://img.shields.io/badge/Node.js-v14.17.0-green)
![React](https://img.shields.io/badge/React-17.0.2-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Docker](https://img.shields.io/badge/Docker-20.10.7-blue)
![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20CDN-orange)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-yellow)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0.1-black)
![Chart.js](https://img.shields.io/badge/Chart.js-3.5.1-red)
![Mapbox API](https://img.shields.io/badge/Mapbox%20API-2.5.0-lightblue)
![JWT](https://img.shields.io/badge/JWT-Security-green)

ClimbPartner is a platform that enables outdoor enthusiasts to design, share, and update bespoke mountain routes. It incorporates real-time updates and social interaction features, enhancing and simplifying every hiking expedition.

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features
- Design and share bespoke mountain routes
- Real-time updates and social interaction features
- Automated CI/CD pipelines for frontend and backend
- Real-time communication with Socket.IO
- Interactive mapping with Mapbox API
- Dynamic data visualization with Chart.js
- Secure user authentication with JWT

## Technologies Used
- **Backend**: Node.js
- **Frontend**: React
- **Database**: MongoDB Atlas
- **Containerization**: Docker
- **Deployment**: AWS EC2, AWS S3, AWS CDN
- **CI/CD**: GitHub Actions
- **Real-Time Communication**: Socket.IO
- **Data Visualization**: Chart.js
- **Mapping**: Mapbox API

## Architecture
The ClimbPartner application is designed with a modern architecture that ensures scalability, maintainability, and robustness. The backend is developed using Node.js, containerized with Docker, and deployed on AWS EC2 instances. The frontend is built with React, packaged as static files, and served via AWS CDN after being uploaded to AWS S3. Real-time communication is facilitated through Socket.IO, and the database operations are optimized with MongoDB Atlas.

## Getting Started

### Prerequisites
Ensure you have the following installed on your machine:
- Node.js
- Docker
- Git

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yajae/climbpartner.git
   cd climbpartner
