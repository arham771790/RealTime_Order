import fs from 'fs';

const customers = [
  'Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Margaret Hamilton', 'Linus Torvalds',
  'John von Neumann', 'Katherine Johnson', 'Donald Knuth', 'Tim Berners-Lee', 'Dennis Ritchie'
];

const products = [
  'Mechanical Keyboard', 'Ergonomic Mouse', '4K Monitor', 'Noise-Cancelling Headphones',
  'Standing Desk', 'Laptop Stand', 'Webcam', 'Microphone', 'USB-C Hub', 'Desk Mat'
];

const statuses = ['pending', 'shipped', 'delivered'];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seed() {
  console.log('Seeding database with orders...');
  
  // Wait for the backend API to be ready
  let isReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:3001/health');
      if (res.ok) {
        isReady = true;
        break;
      }
    } catch (err) {
      // Ignored
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!isReady) {
    console.error('Backend API is not ready. Aborting seed.');
    process.exit(1);
  }
  
  console.log('Backend API is ready. Creating orders...');

  const numOrders = 20;
  for (let i = 0; i < numOrders; i++) {
    const order = {
      customerName: getRandomItem(customers),
      productName: getRandomItem(products),
      status: 'pending' // Initialize as pending, maybe we update some later
    };

    try {
      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log(`✅ Created order ${data.data.id} for ${order.customerName} - ${order.productName}`);
        
        // Randomly update status of some orders to test event pipeline
        if (Math.random() > 0.5) {
            const newStatus = getRandomItem(['shipped', 'delivered']);
            console.log(`   -> Updating status to ${newStatus}`);
            await fetch(`http://localhost:3001/api/orders/${data.data.id}/status`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
              });
        }
      } else {
        console.error(`❌ Failed to create order:`, data);
      }
    } catch (error) {
      console.error('❌ Error creating order:', error.message);
    }
  }

  console.log('✅ Seeding complete!');
}

seed();
