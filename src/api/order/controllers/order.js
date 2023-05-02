"use strict";
const stripe = require("stripe")(
  "sk_test_51N1ZI4KPsWz6lLsfvKXi03Fr8rPLPj1xOZyULfQNvFXZajlYb50Q70rZy8neBdhiGCCY4L1Iwk7oW60H50nn7aEF00tb5xA2GD"
);

/**
 * order controller
 */

function calcDiscountPrize(prize, discount) {
  if (!discount) return prize;
  const discountAmount = (prize * discount) / 100;
  const result = prize - discountAmount;
  return result.toFixed(2);
}

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async paymentOrder(ctx) {
    //Mandamos el token de pago y el listado de los productos a comprar, el id del usuario que va a comprar y la direccion de envio
    const { token, products, idUser, addressShipping } = ctx.request.body;
    //Calculamos el total que va a costar el pedido
    let totalPayment = 0;
    products.forEach((product) => {
      const prizeTemp = calcDiscountPrize(
        product.attributes.prize,
        product.attributes.discount
      );
      totalPayment += Number(prizeTemp) * product.quantity;
    });

    //Ejecutamos el pago sobre stripe
    const charge = await stripe.charges.create({
      amount: Math.round(totalPayment * 100),
      currency: "eur",
      source: token.id,
      description: `ID Usuario: ${idUser}`,
    });

    //Creamos los datos que se van a guardar en la base de datos
    const data = {
      products,
      user: idUser,
      totalPayment,
      idPayment: charge.id,
      addressShipping,
    };

    //Obtenemos el modelo sobre el cual vamos a registrar los datos
    const model = strapi.contentTypes["api::order.order"];

    //Comprobamos que el modelo y los datos que se van a guardar sean correctos
    const validData = await strapi.entityValidator.validateEntityCreation(
      model,
      data
    );

    //Con una query guardamos los datos
    const entry = await strapi.db
      .query("api::order.order")
      .create({ data: validData });

    //Devolvemos el resultado
    return entry;
  },
}));
