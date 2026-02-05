# Search Replace Data

A React.js application for searching and replacing values in data using keys. Supports JSON (including nested keys), .env files, and plain text.

## Features

- **Nested Key Support**: Use dot notation (e.g., `user.name`) to access nested JSON keys
- **Multiple Data Formats**: Works with JSON, .env files, and plain text
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Easy to Use**: Simple interface with clear labels and helpful placeholders

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Docker

#### Build and run with Docker

```bash
docker build -t search-replace-data .
docker run -p 3000:80 search-replace-data
```

The application will be available at `http://localhost:3000`

#### Using Docker Compose

```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

To stop the container:
```bash
docker-compose down
```

## Usage

1. **Key Input**: Enter the key you want to find. For nested JSON keys, use dot notation (e.g., `user.name` or `config.api.url`)
2. **Replacement Value**: Enter the new value that will replace the found key's value
3. **Data Input**: Paste your data (JSON, .env format, or plain text) in the large text area
4. Click **Replace** to process the data
5. View the result and use **Copy** to copy it to your clipboard

## Examples

### JSON Example
- Key: `user.name`
- Replacement Value: `Jane Doe`
- Data:
```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### .env Example
- Key: `API_KEY`
- Replacement Value: `new_secret_key`
- Data:
```
API_KEY=old_secret_key
DATABASE_URL=postgres://localhost
```

## Technologies

- React 18
- Vite
- Modern CSS with animations
