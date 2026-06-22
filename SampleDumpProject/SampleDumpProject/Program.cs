using System;
using System.Collections.Generic;
using System.Linq;

namespace ComplexOrderSystem
{
    public enum OrderStatus
    {
        Pending,
        Processing,
        Shipped,
        Delivered,
        Cancelled
    }

    // Product master
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal BasePrice { get; set; }
    }

    // Customer with nested address
    public class Customer
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public Address Address { get; set; }
    }

    public class Address
    {
        public string City { get; set; }
        public string Country { get; set; }
    }

    // Order Item (important normalization step)
    public class OrderItem
    {
        public Product Product { get; set; }
        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal Total => UnitPrice * Quantity;
    }

    public class Order
    {
        public int Id { get; set; }

        public Customer Customer { get; set; }

        public List<OrderItem> Items { get; set; } = new();

        public OrderStatus Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Derived fields
        public decimal TotalAmount => Items.Sum(i => i.Total);

        public int TotalQuantity => Items.Sum(i => i.Quantity);
    }

    class Program
    {
        static void Main()
        {
            // Product catalog
            var laptop = new Product { Id = 1, Name = "Laptop", BasePrice = 1500 };
            var mouse = new Product { Id = 2, Name = "Mouse", BasePrice = 25 };
            var keyboard = new Product { Id = 3, Name = "Keyboard", BasePrice = 45 };
            var monitor = new Product { Id = 4, Name = "Monitor", BasePrice = 300 };

            // Customers
            var customer1 = new Customer
            {
                Id = 1,
                Name = "Ali",
                Address = new Address
                {
                    City = "Rawalpindi",
                    Country = "Pakistan"
                }
            };

            var customer2 = new Customer
            {
                Id = 2,
                Name = "Sara",
                Address = new Address
                {
                    City = "Lahore",
                    Country = "Pakistan"
                }
            };

            // Orders
            var orders = new List<Order>
            {
                new Order
                {
                    Id = 101,
                    Customer = customer1,
                    Status = OrderStatus.Processing,
                    Items = new List<OrderItem>
                    {
                        new OrderItem
                        {
                            Product = laptop,
                            Quantity = 1,
                            UnitPrice = 1450 // discount applied
                        },
                        new OrderItem
                        {
                            Product = mouse,
                            Quantity = 2,
                            UnitPrice = 20
                        }
                    }
                },

                new Order
                {
                    Id = 102,
                    Customer = customer2,
                    Status = OrderStatus.Shipped,
                    Items = new List<OrderItem>
                    {
                        new OrderItem
                        {
                            Product = keyboard,
                            Quantity = 1,
                            UnitPrice = 45
                        },
                        new OrderItem
                        {
                            Product = monitor,
                            Quantity = 2,
                            UnitPrice = 280
                        }
                    }
                }
            };

            // Query-style usage (like document DB)
            var pakistanOrders = orders
                .Where(o => o.Customer.Address.Country == "Pakistan")
                .ToList();

            // Print
            foreach (var order in pakistanOrders)
            {
                Console.WriteLine($"Order: {order.Id}");
                Console.WriteLine($"Customer: {order.Customer.Name} ({order.Customer.Address.City})");
                Console.WriteLine($"Status: {order.Status}");
                Console.WriteLine($"Created: {order.CreatedAt}");

                Console.WriteLine("Items:");

                foreach (var item in order.Items)
                {
                    Console.WriteLine(
                        $"  - {item.Product.Name} x{item.Quantity} @ {item.UnitPrice} = {item.Total}"
                    );
                }

                Console.WriteLine($"TOTAL QUANTITY: {order.TotalQuantity}");
                Console.WriteLine($"TOTAL AMOUNT: {order.TotalAmount}");

                Console.WriteLine("---------------------------");

                Console.ReadKey();
            }
        }
    }
}