import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createOrder, deleteOrder, updateOrderStatus } from "../api/ordersApi.js";
import AppShell from "../layouts/AppShell.jsx";

const statusOptions = ["pending", "shipped", "delivered"];

const initialCreateForm = {
  customerName: "",
  productName: "",
  status: "pending"
};

function getApiErrorMessage(error) {
  return error?.response?.data?.error?.message ?? error?.message ?? "Request failed.";
}

function ControlCard({ children, eyebrow, title }) {
  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ children, label }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
      {...props}
    />
  );
}

function StatusSelect(props) {
  return (
    <select
      className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
      {...props}
    >
      {statusOptions.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function SubmitButton({ children, isLoading, tone = "default" }) {
  const toneClassName =
    tone === "danger"
      ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
      : "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200";

  return (
    <button
      className={`h-11 border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassName}`}
      disabled={isLoading}
      type="submit"
    >
      {isLoading ? "Working..." : children}
    </button>
  );
}

export default function DemoControls({ activePage, onNavigate }) {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [updateForm, setUpdateForm] = useState({ id: "", status: "shipped" });
  const [deleteId, setDeleteId] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const createMutation = useMutation({
    mutationFn: createOrder,
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
      setResultMessage("");
    },
    onSuccess: (order) => {
      setCreateForm(initialCreateForm);
      setErrorMessage("");
      setResultMessage(`Created order #${order.id}.`);
      refreshOrders();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
      setResultMessage("");
    },
    onSuccess: (order) => {
      setErrorMessage("");
      setResultMessage(`Updated order #${order.id} to ${order.status}.`);
      refreshOrders();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
      setResultMessage("");
    },
    onSuccess: (_, id) => {
      setDeleteId("");
      setErrorMessage("");
      setResultMessage(`Deleted order #${id}.`);
      refreshOrders();
    }
  });

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    createMutation.mutate(createForm);
  };

  const handleUpdateSubmit = (event) => {
    event.preventDefault();
    updateMutation.mutate(updateForm);
  };

  const handleDeleteSubmit = (event) => {
    event.preventDefault();
    deleteMutation.mutate(deleteId);
  };

  return (
    <AppShell activePage={activePage} onNavigate={onNavigate}>
      <div className="px-5 py-6 sm:px-8">
        <section className="border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Interview demo toolkit
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
            Generate realtime order events
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Use these controls to call the backend REST API. The database triggers and websocket
            pipeline will broadcast the resulting create, update, and delete events to subscribed
            dashboard clients.
          </p>
        </section>

        {resultMessage ? (
          <div className="mt-4 border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {resultMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ControlCard eyebrow="Create" title="Create Order">
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              <Field label="Customer name">
                <TextInput
                  onChange={(event) =>
                    setCreateForm((form) => ({ ...form, customerName: event.target.value }))
                  }
                  placeholder="Ada Lovelace"
                  required
                  value={createForm.customerName}
                />
              </Field>
              <Field label="Product name">
                <TextInput
                  onChange={(event) =>
                    setCreateForm((form) => ({ ...form, productName: event.target.value }))
                  }
                  placeholder="Realtime Monitor"
                  required
                  value={createForm.productName}
                />
              </Field>
              <Field label="Initial status">
                <StatusSelect
                  onChange={(event) =>
                    setCreateForm((form) => ({ ...form, status: event.target.value }))
                  }
                  value={createForm.status}
                />
              </Field>
              <SubmitButton isLoading={createMutation.isPending}>Create Order</SubmitButton>
            </form>
          </ControlCard>

          <ControlCard eyebrow="Update" title="Update Status">
            <form className="space-y-4" onSubmit={handleUpdateSubmit}>
              <Field label="Order ID">
                <TextInput
                  min="1"
                  onChange={(event) =>
                    setUpdateForm((form) => ({ ...form, id: event.target.value }))
                  }
                  placeholder="42"
                  required
                  type="number"
                  value={updateForm.id}
                />
              </Field>
              <Field label="New status">
                <StatusSelect
                  onChange={(event) =>
                    setUpdateForm((form) => ({ ...form, status: event.target.value }))
                  }
                  value={updateForm.status}
                />
              </Field>
              <SubmitButton isLoading={updateMutation.isPending}>Update Status</SubmitButton>
            </form>
          </ControlCard>

          <ControlCard eyebrow="Delete" title="Delete Order">
            <form className="space-y-4" onSubmit={handleDeleteSubmit}>
              <Field label="Order ID">
                <TextInput
                  min="1"
                  onChange={(event) => setDeleteId(event.target.value)}
                  placeholder="42"
                  required
                  type="number"
                  value={deleteId}
                />
              </Field>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Deleting an order creates a realtime delete event so clients can remove or mark the
                row without refreshing.
              </p>
              <SubmitButton isLoading={deleteMutation.isPending} tone="danger">
                Delete Order
              </SubmitButton>
            </form>
          </ControlCard>
        </div>
      </div>
    </AppShell>
  );
}
