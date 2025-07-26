# AI Trading Bot System

## Overview

This is a professional AI trading bot system with a web-based control interface. The application provides automated forex trading capabilities using MetaTrader 5 (MT5) integration, news-aware trading logic, and a comprehensive dashboard for monitoring and manual control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Overall Architecture
The system follows a modern full-stack architecture with:
- **Frontend**: React-based dashboard with real-time updates
- **Backend**: Express.js server with WebSocket support
- **Database**: PostgreSQL with Drizzle ORM
- **Trading Engine**: MT5 integration with automated strategies
- **News Integration**: Economic calendar with impact-based trading pauses

### Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **Charts**: Chart.js for trading visualizations
- **Build**: Vite for frontend bundling, esbuild for backend

## Key Components

### Frontend Components
- **Dashboard**: Main trading interface with real-time updates
- **Price Charts**: Live price visualization with Chart.js
- **Performance Metrics**: Account balance, equity tracking, trade statistics
- **Economic Calendar**: News events display with impact indicators
- **Position Management**: Open trades monitoring and manual closure
- **Trade History**: Historical trade performance tracking
- **Manual Trading**: Buy/sell controls for emergency interventions

### Backend Services
- **MT5 Service**: Direct integration with MetaTrader 5 platform
- **Trading Bot**: Automated trading logic with multiple strategies
- **News Service**: Economic calendar fetching and impact filtering
- **WebSocket Service**: Real-time data broadcasting to frontend
- **Storage Service**: Database operations and trade logging

### Database Schema
- **Users**: User authentication and management
- **Accounts**: MT5 account connections and status
- **Trades**: Complete trade lifecycle tracking
- **News Events**: Economic calendar with impact ratings
- **Bot Settings**: Strategy parameters and risk management
- **Price Data**: Historical price information for analysis

## Data Flow

### Trading Flow
1. **Market Analysis**: Bot analyzes price data using technical indicators
2. **News Check**: Verifies no high-impact news events are scheduled
3. **Signal Generation**: Creates buy/sell signals based on strategy
4. **Risk Management**: Applies position sizing and stop-loss rules
5. **Order Execution**: Sends trades to MT5 platform
6. **Monitoring**: Tracks position performance and manages exits

### Real-time Updates
1. **WebSocket Connection**: Establishes persistent connection to frontend
2. **Data Broadcasting**: Sends live account info, prices, and trade updates
3. **Event Handling**: Processes manual trade requests and bot controls
4. **Status Monitoring**: Tracks MT5 connection and bot operational status

### News Integration
1. **Calendar Fetching**: Retrieves economic events from external APIs
2. **Impact Analysis**: Filters high/medium/low impact events
3. **Trading Pause**: Automatically stops trading during high-impact periods
4. **Resume Logic**: Restarts trading after news event window closes

## External Dependencies

### Trading Platform
- **MetaTrader 5**: Core trading platform integration
- **FXTM Broker**: Demo account provider ($2M demo balance)
- **MT5 Python Library**: Bridge for automated trading

### News Data Sources
- **Forex Factory**: Primary economic calendar source
- **Alpha Vantage**: Alternative financial news API
- **Fallback System**: Mock data when APIs unavailable

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first styling
- **Chart.js**: Financial chart rendering

### Database & ORM
- **Neon Database**: Serverless PostgreSQL provider
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Efficient database connection management

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite-powered development server with HMR
- **Error Handling**: Runtime error overlay for debugging
- **Environment Variables**: Secure configuration management

### Production Considerations
- **Build Process**: Optimized bundling for client and server
- **Asset Management**: Static file serving with proper caching
- **Database Migrations**: Automated schema updates via Drizzle
- **Environment Separation**: Development vs production configurations

### Scalability Features
- **WebSocket Scaling**: Multiple client connection support
- **Database Pooling**: Efficient connection management
- **Error Recovery**: Automatic reconnection for MT5 and WebSocket
- **Logging System**: Comprehensive trade and system event logging

### Security Measures
- **Environment Variables**: Sensitive data protection
- **Session Management**: Secure user authentication
- **Input Validation**: Zod schema validation for all inputs
- **CORS Configuration**: Proper cross-origin request handling

This architecture provides a robust foundation for professional forex trading with automated strategies, risk management, and comprehensive monitoring capabilities. The system is designed to handle real-time market data, execute trades safely, and provide traders with full visibility and control over their trading operations.