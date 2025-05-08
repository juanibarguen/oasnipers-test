const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const { Resend } = require('resend');



require('dotenv').config();

//CLAVE PRUEBA JUANI  
const resend = new Resend('re_fab3ZaQj_FBjMrT5rTnPCGgp7ERwgLb9q');

const CLIENT_ID = 'AWBRM0MlAogvyWWk8uCHllzE1yWnhC2NXolqyNhptMOP0LvHGjHb_SxOs_Lg9qStJhlLP-pWBB1ncm-C';
const CLIENT_SECRET = 'EGd6uGugKlDbZFGq_JJ4Uh2VXeW-T3IzbF-Yg1jMN_yBHTZrK7qCtQpGboj7PEMHvkeHIx9sxpmT7Bo7';
const PORT = 3000;

let planIds = {};

const app = express();

app.use(bodyParser.json());
app.use(express.static('public')); // Servir archivos estáticos desde la carpeta 'public'



async function getAccessToken() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET,
      },
      data: 'grant_type=client_credentials',
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to obtain access token');
  }
}

async function createProduct(name, description) {
  try {
    const accessToken = await getAccessToken();
    const productData = {
      name: name,
      description: description,
      type: "SERVICE",
      category: "SOFTWARE"
    };

    const response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/catalogs/products',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `request-${Math.random()}`,
      },
      data: productData,
    });

    console.log(`${name} product created:`, response.data);
    return response.data.id;
  } catch (error) {
    console.error(`Error creating ${name} product:`, error.response ? error.response.data : error.message);
    throw new Error(`Failed to create ${name} product`);
  }
}

let ungatedPlanId;
let mixtaPlanId;
let exclusivePlanId;


async function createPlan(productId, name, description, price1, price2) {
  try {
    const accessToken = await getAccessToken();
    
    const planData = {
      product_id: productId,
      name: name,
      description: description,
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: {
              value: price1,
              currency_code: "USD"
            }
          }
        },
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 2,
          pricing_scheme: {
            fixed_price: {
              value: price2,
              currency_code: "USD"
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD"
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: "0",
        inclusive: false
      }
    };
      
    const response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/billing/plans',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `request-${Math.random()}`,
      },
      data: planData,
    });

    //console.log('Plan created:', response.data);
    
    // Almacenar el ID del plan en la variable correspondiente según el nombre del plan
    if (name.toLowerCase().includes('ungated')) {
      ungatedPlanId = response.data.id;
      console.log(ungatedPlanId);
    } else if (name.toLowerCase().includes('mixta')) {
      mixtaPlanId = response.data.id;
      console.log(mixtaPlanId);
    } else if (name.toLowerCase().includes('exclusive')) {
      exclusivePlanId = response.data.id;
      console.log(exclusivePlanId);
    }
    
    //return response.data.id; // Devolver el ID del plan
  } catch (error) {
    console.error('Error creating plan:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create plan');
  }
}


async function initializeProducts() {
  try {
    const ungatedProductId = await createProduct("Ungated", "Un servicio de listas");
    const mixtaProductId = await createProduct("Mixta", "Un servicio de listas Mixta");
    const exclusiveProductId = await createProduct("Exclusive", "Un servicio de listas Exclusive");
    
    // Crear los planes correspondientes y almacenar sus IDs
    const ungatedPlan = await createPlan(ungatedProductId, "Ungated Plan", "Plan de suscripción para Ungated", "50.00", "75.00");
    const mixtaPlan = await createPlan(mixtaProductId, "Mixta Plan", "Plan de suscripción para Mixta", "75.00", "100.00");
    const exclusivePlan = await createPlan(exclusiveProductId, "Exclusive Plan", "Plan de suscripción para Exclusive", "100.00", "120.00");
    
    console.log('All products and plans created successfully');
    
    // Almacenar los IDs de los planes
    planIds = { ungatedPlan, mixtaPlan, exclusivePlan };
    
    return { ungatedProductId, mixtaProductId, exclusiveProductId };
  } catch (error) {
    console.error('Error initializing products and plans:', error);
    throw new Error('Failed to initialize products and plans');
  }
}

// Llamar a initializeProducts() al iniciar el servidor
initializeProducts().catch(err => {
  console.error("Failed to initialize products and plans on startup:", err);
});

// Manejador de la ruta '/success'
let nombreForm;
let apellidoForm;
let emailForm;


app.get('/success', (req, res) => {
  const { subscription_id, ba_token, token } = req.query;

  if (!subscription_id) {
    return res.status(400).send('Subscription ID not provided');
  }

  console.log(nombreForm);
  console.log(apellidoForm);
  console.log(emailForm);
  console.log(listaForm); // Mostrar la lista recibida

  resend.emails.send({
    from: 'oasnipers@resend.dev',
    to: emailForm,
    subject: 'Bienvenido a OA Snipers',
    html: `Hola ${nombreForm} bienvenido a la lista ${listaForm}, tu pago se registró con éxito.`
  });

  resend.emails.send({
    from: 'oasnipers@resend.dev',
    to: 'juanibarguen159@gmail.com',
    subject: `Nueva suscripción de ${nombreForm}`,
    html: `Nueva suscripción de ${nombreForm} ${apellidoForm} a la lista ${listaForm}, el pago se registró con éxito. Correo a agregar: ${emailForm}`
  });

 // res.send('<h1>Gracias por tu pago</h1><p>Tu suscripción ha sido creada con éxito.</h1>');
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pago realizado con exito - OA Snipers</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f0f0f0;
          text-align: center;
        }
        h1 {
          color: #007BFF;
          margin-bottom: 20px;
        }
        p {
          font-size: 1.2em;
          color: #333;
        }
        img {
          max-width: 200px;
          height: auto;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <img src="assets/logos/logo.png" alt="Bienvenido">
      <img src="assets/logos/letras.png" alt="Bienvenido">
      <h1>Pago realizado con exito</h1>
      <p>Tu suscripción ha sido creada con éxito.</h1>
      <p>Estamos encantados de tenerte aquí. La lista sera enviada diariamente a su correo electronico </p>
      <a href="/index.html">Volver al inicio</a>
    </body>
    </html>
  `);
});




// Manejador de la ruta '/cancel'
app.get('/cancel', (req, res) => {
  res.send('<h1>Pago cancelado</h1><p>Lo sentimos, tu suscripción no ha sido completada.</p>');
});

// Modificar la ruta /subscribe/:planId para usar createSubscription
app.post('/subscribe/:planId', async (req, res) => {
  const { planId } = req.params;
  const { userEmail } = req.body;

  try {
    const subscriptionResponse = await createSubscription(planId, userEmail);
    res.json(subscriptionResponse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PayPal subscription' });
  }
});


// Función para crear una suscripción
async function createSubscription(planId, firstName, lastName, email, list) {
  try {
    const accessToken = await getAccessToken();


    const subscriptionData = {
      plan_id: planId,
      subscriber: {
        email_address: email,
        name: {
          given_name: firstName,
          surname: lastName
        }
      },
      application_context: {
        brand_name: 'OA Snipers',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: 'https://oasnipers-test.onrender.com/success',
        cancel_url: 'https://oasnipers-test.onrender.com/cancel'
      }
    };

    const response = await axios.post('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', subscriptionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    nombreForm = firstName;
    apellidoForm = lastName;
    emailForm = email;
    listaForm = list; // Guardar la lista en una variable global
    return response.data;
  } catch (error) {
    console.error('Error creating subscription:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create subscription');
  }
}



// Ruta para manejar la suscripción del plan Mixta
app.post('/subscribe-mixta', async (req, res) => {
  const { firstName, lastName, email, list } = req.body;

  if (!list) {
    return res.status(400).json({ error: 'List is required' });
  }

  try {
    const subscriptionResponse = await createSubscription(mixtaPlanId, firstName, lastName, email, list);
    res.json({ approvalUrl: subscriptionResponse.links.find(link => link.rel === 'approve').href });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PayPal subscription' });
  }
});

// Ruta para manejar la suscripción del plan Ungated
app.post('/subscribe-ungated', async (req, res) => {
  const { firstName, lastName, email, list } = req.body;

  if (!list) {
    return res.status(400).json({ error: 'List is required' });
  }

  try {
    const subscriptionResponse = await createSubscription(ungatedPlanId, firstName, lastName, email, list);
    res.json({ approvalUrl: subscriptionResponse.links.find(link => link.rel === 'approve').href });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PayPal subscription' });
  }
});


// Ruta para manejar la suscripción del plan Exclusive
app.post('/subscribe-exclusive', async (req, res) => {
  const { firstName, lastName, email, list } = req.body;

  if (!list) {
    return res.status(400).json({ error: 'List is required' });
  }

  try {
    const subscriptionResponse = await createSubscription(exclusivePlanId, firstName, lastName, email, list);
    res.json({ approvalUrl: subscriptionResponse.links.find(link => link.rel === 'approve').href });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PayPal subscription' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});



  app.post('/submit-form', (req, res) => {
    const { firstName, lastName, email } = req.body;
    
    // Guardar los datos del formulario en la sesión
    req.session.formData = { firstName, lastName, email };
  
    // Redirigir al usuario a la página de éxito
    res.redirect('/success');
  });





// Ruta para enviar correo de contacto utilizando Resend
//FUNCIONANDO
app.post('/send-email', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: 'juanibarguen159@gmail.com',
      subject: 'Nuevo mensaje de CONTACTO',
      html: `<p>Nombre: ${name}</p><p>Correo electrónico: ${email}</p><p>Mensaje: ${message}</p>`
    });
    res.status(200).json({ message: 'Email enviado exitosamente' });
    console.log("nombre: " + name + " correo: " + email + " mensaje: " + message);
  } catch (error) {
    console.error('Error enviando email:', error.message);
    res.status(500).json({ message: 'Error al enviar el email', error: error.message });
  }
});




// Ruta para suscribirse a la newsletter utilizando Resend
//FUNCIONANDO
app.post('/subscribe-newsletter', async (req, res) => {
  const { email } = req.body;

  try {
    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: email, // Enviar al correo electrónico ingresado
      subject: 'Suscripción a la Newsletter',
      html: `<p>Hola,</p><p>Gracias por suscribirte a nuestra newsletter. Ahora recibirás anuncios, novedades de blog y cursos directamente en tu correo.</p><p>Saludos,<br>El equipo de OA Snipers</p>`
    });

    resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: 'juanibarguen159@gmail.com',
      subject: `Nueva suscripciona a newsletter`,
      html: `Nueva suscripcion a la newsletter. Correo a agregar: ${email}`
    });


    res.status(200).json({ message: 'Te has suscrito exitosamente. Revisa tu correo para más detalles.' });
    console.log("Nuevo suscriptor: " + email);
  } catch (error) {
    console.error('Error enviando email:', error.message);
    res.status(500).json({ message: 'Error al suscribirse. Por favor, intenta nuevamente.', error: error.message });
  }
});



// SUSCRIPCION A SEMANA GRATUITA
app.post('/subscribe-week-free', async (req, res) => {
  const { name, email, list } = req.body;

  try {
    // Enviar correo al administrador
    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: 'juanibarguen159@gmail.com',
      subject: 'Suscripción a semana gratuita',
      html: `<p>Nueva subscripción gratuita de: ${name}</p>
             <p>Lista seleccionada: ${list}.</p>
             <p>Correo a registrar: ${email}</p>`
    });

    // Enviar correo al usuario
    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: email,
      subject: 'Bienvenido a la semana gratuita',
      html: `<p>Hola, ${name}, bienvenido a la prueba gratuita de la lista ${list}. Tu correo ha sido registrado con éxito en nuestra base de datos.</p>`
    });

    // Solo una respuesta al cliente
    res.status(200).json({ message: 'Te has suscrito exitosamente. Revisa tu correo para más detalles.' });
    console.log(`Nuevo suscriptor: ${name}, ${email}, ${list}`);
  } catch (error) {
    console.error('Error enviando email:', error.message);
    res.status(500).json({ message: 'Error al suscribirse. Por favor, intenta nuevamente.', error: error.message });
  }
});



module.exports = app; // Exporta la app de Express
