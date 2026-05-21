import axios from 'axios';

async function main() {
  const key = 'c480e8c8ebc9bc9c34d48b9e03efb9c2';
  const url = `https://web.cyanide-studio.com/ws/?key=${key}&bb=3`;

  try {
    console.log('Sending request to Cyanide metadata endpoint...');
    const response = await axios.get(url);
    console.log('Response status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error fetching metadata schema:', error.message);
  }
}

main();
