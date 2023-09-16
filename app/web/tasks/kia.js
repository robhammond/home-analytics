const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { VehicleManager } = require('hyundai_kia_connect_api'); // Replace with actual npm package if available

const updateVehicleDetails = async () => {
  try {
    const creds = await prisma.credential.findMany({
      where: {
        entity: {
          entity_name: {
            equals: 'kia',
            mode: 'insensitive',
          },
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const credentials = creds.reduce((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});

    const cars = await prisma.car.findMany({
      where: {
        make: {
          equals: 'kia',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        vin: true,
        model: true,
      },
    });

    credentials.cars = cars;

    const vm = new VehicleManager({
      region: 1,
      brand: 1,
      username: credentials.username,
      password: credentials.password,
      pin: '',
    });

    await vm.checkAndRefreshToken();
    await vm.updateAllVehiclesWithCachedState();

    for (const vehicleId of Object.keys(vm.vehicles)) {
      const vehicleDetails = vm.getVehicle(vehicleId);

      const matchedCar = credentials.cars.find(
        car => car.model.toLowerCase() === vehicleDetails.model.toLowerCase()
      );

      if (!matchedCar) continue;

      const data = {
        //...populate data
      };

      await prisma.carStatus.create({
        data: {
          // ...data,
        },
      });
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
};

updateVehicleDetails();
