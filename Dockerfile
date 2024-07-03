# Use the official Node.js image to build the app
FROM node:20.13.1 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Use a lightweight web server to serve the build
FROM node:20.13.1

# Install serve globally
RUN npm install -g serve

# Copy the build output to serve it
COPY --from=build /app/build /app/build

# Set the working directory
WORKDIR /app

# Serve the app
CMD ["serve", "-s", "build"]

# Expose port 5000
EXPOSE 5000

