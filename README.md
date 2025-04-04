# Ecorce.app

Ecorce.app is a web-based e-commerce and order management system designed for businesses that need to manage product inventory, customer orders, and delivery operations.

## Overview

The platform allows customers to browse products, place orders, and track delivery status, while enabling delivery staff to manage the collection, delivery, and signature confirmation of orders. Admin users can manage product information, pricing, and monitor overall sales.

## Key Features

- **Product Management**: Browse, filter, and search products by category, bio status, and more
- **Basket Functionality**: Add products to basket with quantity selection, add comments to items
- **Order Management**: Place orders, view order history, and track delivery status
- **Delivery Dashboard**: Manage collection, delivery, and signature confirmation
- **Price Management**: Centralized pricing system with margins and delivery-specific price overrides
- **Reporting**: Generate delivery bills and supplier-specific order aggregations

## Technology Stack

- **Frontend**: React, Material-UI, React Context API
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions, Storage)
- **State Management**: React Context API
- **Styling**: Material-UI with responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account and project

### Installation

1. Clone the repository
   ```
   git clone https://github.com/onemap-git/ecorce-app.git
   cd ecorce-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser

## Project Structure

- **`/src`**: React application source code
  - **`/components`**: UI components
    - `DeliveryDashboard.js`: Main interface for delivery personnel
    - `ProductsPage.js`: Product listing and basket management
    - `OrderHistory.js`: Customer order history display
    - `Basket.js`: Shopping cart component
  - **`/contexts`**: React contexts
    - `PricingContext.js`: Centralized pricing management
  - **`/hooks`**: Custom React hooks
    - `useDeliveryAggregation.js`: Data fetching and aggregation
  - **`/utils`**: Utility functions
    - `pdfUtils.js`: PDF generation utilities
    - `formatPrice.js`: Price formatting functions
    - `dateUtils.js`: Date handling utilities

## Deployment

The application is deployed using Firebase Hosting. To deploy:

1. Build the application
   ```
   npm run build
   ```

2. Deploy to Firebase
   ```
   firebase deploy
   ```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

This project is proprietary and confidential.
