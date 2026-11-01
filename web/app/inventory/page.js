"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const emptyItem = {
  item_kind: "WEAPON",
  item_name: "",
  rarity: "COMMON",
  base_price: "",
  damage: "",
  slot_type: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [players, setPlayers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [search, setSearch] = useState("");
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/items?search=${encodeURIComponent(search)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch items");
      }

      setItems(data.items);
    } catch (error) {
      setMessage(error.message);
    }
  }, [search]);

  const fetchInventory = useCallback(async () => {
    try {
      const query = selectedPlayer
        ? `?player_id=${selectedPlayer}`
        : "";

      const response = await fetch(`/api/inventory${query}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch inventory");
      }

      setPlayers(data.players);
      setInventory(data.inventory);

      if (selectedPlayer) {
        setItems((previous) => previous);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  function handleItemChange(event) {
    setItemForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function submitItem(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `/api/items/${editingId}` : "/api/items",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemForm),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Item operation failed");
      }

      setMessage(data.message);
      setItemForm(emptyItem);
      setEditingId(null);
      await fetchItems();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editItem(item) {
    setEditingId(item.item_id);
    setItemForm({
      item_kind: item.item_kind,
      item_name: item.item_name,
      rarity: item.rarity,
      base_price: String(item.base_price),
      damage: item.damage == null ? "" : String(item.damage),
      slot_type: item.slot_type || "",
    });
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete ${item.item_name}?`)) return;

    setMessage("");

    try {
      const response = await fetch(`/api/items/${item.item_id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete item");
      }

      setMessage(data.message);
      await fetchItems();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addToInventory(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: selectedPlayer,
          item_id: selectedItem,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add item");
      }

      setMessage(data.message);
      setSelectedItem("");
      setQuantity("1");
      await fetchInventory();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateQuantity(itemId, newQuantity) {
    setMessage("");

    try {
      const response = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: selectedPlayer,
          item_id: itemId,
          quantity: newQuantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update quantity");
      }

      setMessage(data.message);
      await fetchInventory();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeFromInventory(item) {
    if (!window.confirm(`Remove ${item.item_name} from this inventory?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `/api/inventory?player_id=${selectedPlayer}&item_id=${item.item_id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove item");
      }

      setMessage(data.message);
      await fetchInventory();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Inventory</h1>
          <p>Manage game items and player inventories.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => {
            fetchItems();
            fetchInventory();
          }}
        >
          Refresh
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <h2>{editingId ? "Edit Item" : "Create Item"}</h2>
        </div>

        <form className="player-form" onSubmit={submitItem}>
          <div className="form-grid">
            <label>
              Item Name
              <input
                name="item_name"
                value={itemForm.item_name}
                onChange={handleItemChange}
                maxLength={60}
                required
              />
            </label>

            <label>
              Item Type
              <select
                name="item_kind"
                value={itemForm.item_kind}
                onChange={handleItemChange}
              >
                <option value="WEAPON">Weapon</option>
                <option value="COSMETIC">Cosmetic</option>
              </select>
            </label>

            <label>
              Rarity
              <select
                name="rarity"
                value={itemForm.rarity}
                onChange={handleItemChange}
              >
                <option value="COMMON">Common</option>
                <option value="RARE">Rare</option>
                <option value="EPIC">Epic</option>
                <option value="LEGENDARY">Legendary</option>
              </select>
            </label>

            <label>
              Base Price
              <input
                type="number"
                name="base_price"
                min="0"
                step="0.01"
                value={itemForm.base_price}
                onChange={handleItemChange}
                required
              />
            </label>

            <label>
              Damage
              <input
                type="number"
                name="damage"
                min="0"
                max="32767"
                value={itemForm.damage}
                onChange={handleItemChange}
              />
            </label>

            <label>
              Slot Type
              <input
                name="slot_type"
                maxLength={16}
                value={itemForm.slot_type}
                onChange={handleItemChange}
                placeholder="e.g. HEAD, BODY"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingId ? "Save Changes" : "Create Item"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingId(null);
                  setItemForm(emptyItem);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Item Catalogue</h2>
            <p>{items.length} item(s) found</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {items.length === 0 ? (
          <p className="empty-state">No items found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Rarity</th>
                  <th>Price</th>
                  <th>Damage</th>
                  <th>Slot</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id}>
                    <td>#{item.item_id}</td>
                    <td>{item.item_name}</td>
                    <td>{item.item_kind}</td>
                    <td>{item.rarity}</td>
                    <td>{Number(item.base_price).toFixed(2)}</td>
                    <td>{item.damage ?? "—"}</td>
                    <td>{item.slot_type || "—"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          onClick={() => editItem(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() => deleteItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Player Inventory</h2>
            <p>Select a player to manage their items.</p>
          </div>
        </div>

        <label className="inventory-player-select">
          Player
          <select
            value={selectedPlayer}
            onChange={(event) => setSelectedPlayer(event.target.value)}
          >
            <option value="">Select a player</option>
            {players.map((player) => (
              <option key={player.player_id} value={player.player_id}>
                {player.username} (#{player.player_id})
              </option>
            ))}
          </select>
        </label>

        {selectedPlayer && (
          <>
            <form className="player-form" onSubmit={addToInventory}>
              <div className="form-grid">
                <label>
                  Item
                  <select
                    value={selectedItem}
                    onChange={(event) => setSelectedItem(event.target.value)}
                    required
                  >
                    <option value="">Select an item</option>
                    {items.map((item) => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_name} ({item.rarity})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Quantity to Add
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={items.length === 0}
                >
                  Add Item
                </button>
              </div>
            </form>

            <div className="section-heading">
              <h2>Owned Items</h2>
            </div>

            {loading ? (
              <p className="empty-state">Loading inventory...</p>
            ) : inventory.length === 0 ? (
              <p className="empty-state">
                This player does not own any items.
              </p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Rarity</th>
                      <th>Quantity</th>
                      <th>Acquired</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.item_id}>
                        <td>{item.item_name}</td>
                        <td>{item.item_kind}</td>
                        <td>{item.rarity}</td>
                        <td>
                          <input
                            className="table-input"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => {
                              const value = event.target.value;
                              setInventory((previous) =>
                                previous.map((entry) =>
                                  entry.item_id === item.item_id
                                    ? { ...entry, quantity: value }
                                    : entry
                                )
                              );
                            }}
                          />
                        </td>
                        <td>
                          {new Date(item.acquired_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="secondary-button"
                              onClick={() =>
                                updateQuantity(item.item_id, item.quantity)
                              }
                            >
                              Save
                            </button>

                            <button
                              className="danger-button"
                              onClick={() => removeFromInventory(item)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
