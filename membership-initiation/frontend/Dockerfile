# Use an official Node.js image
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the Vite dev server port
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --spider http://localhost:5173/ || exit 1

# Start the Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]