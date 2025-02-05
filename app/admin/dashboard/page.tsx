"use client"
import ProtectedRoute from "@/app/components/protected/page";
import { client } from "@/sanity/lib/client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import React from "react";
import { useRouter } from "next/navigation";

// Define Order Type
interface Order {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  zipCode: string;
  subTotal: number;
  discount: number;
  orderDate: string;
  status: string;
  cartItems: { productName: string; image: string }[];
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const router = useRouter();

  // Fetch orders from Sanity
  useEffect(() => {
    client
      .fetch(
        `*[_type == "order"]{
          _id,
          firstName,
          lastName,
          phone,
          email,
          city,
          address,
          zipCode,
          subTotal,
          discount,
          orderDate,
          status,
          cartItems[]{
            productName,
            image
          }
        }`
      )
      .then((data) => setOrders(data))
      .catch((error) => console.error("Error fetching orders:", error));
  }, []);

  // Filter orders based on status
  const filteredOrders =
    filter === "All" ? orders : orders.filter((order) => order.status === filter);

  // Toggle Order Details
  const toggleOrderDetails = (orderId: string) => {
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // Handle Order Deletion
  const handleDelete = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await client.delete(orderId);
      setOrders((prevOrders) => prevOrders.filter((order) => order._id !== orderId));
      Swal.fire("Deleted", "Your order has been deleted", "success");
    } catch {
      Swal.fire("Error", "Failed to delete order", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn"); 
    router.push("/admin"); 
  };

  // Handle Status Change
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await client.patch(orderId).set({ status: newStatus }).commit();

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      Swal.fire(
        newStatus === "dispatch" ? "Order Dispatched" : "Success",
        newStatus === "dispatch"
          ? "Your order has been dispatched"
          : "Your order has been completed",
        "success"
      );
    } catch {
      Swal.fire("Error", "Failed to change status", "error");
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Navbar */}
        <nav className="bg-gray-600 text-white p-4 shadow-lg flex justify-between">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <div className="flex space-x-4">
            {["All", "pending", "dispatch", "success"].map((status) => (
              <button
                key={status}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === status ? "bg-white text-black font-bold" : "text-white"
                }`}
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 rounded-lg transition-all bg-red-500 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Orders Table */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl mb-4 text-center text-gray-500 font-extrabold">Orders</h2>
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm lg:text-base">
              <thead className="bg-gray-50 text-gray-600 h-10">
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <React.Fragment key={order._id}>
                    <tr
                      className="cursor-pointer hover:bg-red-100 transition-all"
                      onClick={() => toggleOrderDetails(order._id)}
                    >
                      <td>{order._id}</td>
                      <td>{order.firstName} {order.lastName}</td>
                      <td>{order.address}</td>
                      <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td>${order.subTotal}</td>
                      <td>
                        <select
                          value={order.status || ""}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className="bg-gray-100 p-1 rounded"
                        >
                          <option value="pending">Pending</option>
                          <option value="dispatch">Dispatch</option>
                          <option value="success">Completed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(order._id);
                          }}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {selectedOrderId === order._id && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 p-4 transition-all animate-fadeIn">
                          <h3 className="font-bold">Order Details</h3>
                          <p><strong>Phone:</strong> {order.phone}</p>
                          <p><strong>Email:</strong> {order.email}</p>
                          <p><strong>City:</strong> {order.city}</p>
                          <ul>
                            {order.cartItems.map((item, index) => (
                              <li key={`${order._id}-${index}`} className="flex items-center gap-2">
                                {item.productName}
                                {item.image && (
                                  <Image src={urlFor(item.image).url()} width={40} height={40} alt={item.productName} />
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


