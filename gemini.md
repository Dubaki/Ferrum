# Project Summary: PlanFer

This project is a **React-based web application** built with **Vite** and styled using **Tailwind CSS**. It functions as an **Enterprise Resource Planning (ERP)** or **Project Management** system, designed to manage various aspects of business operations.

## Core Technologies:
*   **Frontend:** React, Vite, Tailwind CSS
*   **Backend/Database:** Firebase (likely for authentication, hosting, and possibly other services), Supabase (for database and storage).
*   **Testing:** Vitest
*   **Language:** JavaScript (with TypeScript types evident in `types/index.ts`)

## Key Functionalities and Modules:

The application is structured around several distinct operational areas, indicated by its component and hook organization:

1.  **Project Planning & Scheduling (Gantt):**
    *   Visualizes project timelines and tasks using Gantt charts.
    *   Components: `GanttTab.jsx`, `GanttChart.jsx`, `Heatmap.jsx`.
    *   Data Hooks: `useGanttData.js`.

2.  **Order and Product Management (Planning):**
    *   Handles the creation, management, and tracking of products and customer orders.
    *   Components: `PlanningTab.jsx`, `AddProductModal.jsx`, `NewOrderModal.jsx`, `OperationRow.jsx`, `OrderCard.jsx`, `ProductCard.jsx`.
    *   Data Hooks: `useOrders.js`, `useProducts.js`.

3.  **Resource and Workload Management:**
    *   Manages resources (e.g., personnel, equipment) and optimizes workload distribution.
    *   Components: `ResourcesTab.jsx`, `WorkloadTab.jsx`, `WorkshopMode.jsx`.
    *   Data Hooks: `useResources.js`, `useSimulation.js`.

4.  **Reporting and Analytics:**
    *   Provides various reports for performance analysis, efficiency, and financial oversight.
    *   Components: `ReportsTab.jsx`, `CombinedArchiveView.jsx`, `MasterEfficiencyView.jsx`, `SalaryView.jsx`, `SalaryMatrixModal.jsx`.
    *   Data Hooks: `useReports.js`, `useProductionData.js`.

5.  **Supply Chain / Request Management:**
    *   Facilitates the creation and tracking of supply requests and deliveries.
    *   Components: `SupplyTab.jsx`, `CreateRequestModal.jsx`, `DeliveryDateModal.jsx`, `SupplyRequestCard.jsx`, `RequestDetailsModal.jsx`.
    *   Data Hooks: `useSupplyRequests.js`.

## Architecture & Conventions:
*   **Component-based:** UI is broken down into reusable components.
*   **Custom Hooks:** Extensive use of custom React hooks for data fetching and state logic, promoting clean and modular code.
*   **Utility Functions:** A `utils` directory for common helpers, constants, and validation logic.
*   **Type Safety:** Uses TypeScript for type definitions, enhancing code reliability.

This project appears to be a comprehensive business management tool, likely for manufacturing or similar industries, given the focus on production, planning, and resource allocation.