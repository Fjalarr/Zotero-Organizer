/* global Zotero */

var EixosOrganizer = (function () {
  async function listAllCollections(libraryID) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const rows = await Zotero.DB.queryAsync(
      `SELECT collectionID, collectionName, parentCollectionID, key
       FROM collections
       WHERE libraryID = ?
         AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)`,
      [libID]
    );
    if (!rows || rows.length === 0) return [];

    const byID = new Map();
    for (const r of rows) {
      byID.set(r.collectionID, r);
    }

    function buildPath(row) {
      const parts = [row.collectionName];
      let cur = row;
      let guard = 0;
      while (cur.parentCollectionID && byID.has(cur.parentCollectionID) && guard < 20) {
        cur = byID.get(cur.parentCollectionID);
        parts.unshift(cur.collectionName);
        guard++;
      }
      return parts.join(" / ");
    }

    return rows
      .map((r) => ({
        id: r.collectionID,
        key: r.key,
        name: r.collectionName,
        parentID: r.parentCollectionID || null,
        path: buildPath(r),
      }))
      .sort((a, b) => a.path.localeCompare(b.path, "pt-BR", { sensitivity: "base" }));
  }

  /**
   * Reads the thematic hierarchy under targetRootKey.
   * Supports 1-level (Eixo -> items) and 2-level (Eixo -> Tema -> items) structures.
   */
  async function getTargetTree(libraryID, targetRootKey) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const rootCol = Zotero.Collections.getByLibraryAndKey(libID, targetRootKey);
    if (!rootCol) {
      throw new Error(`Subcoleção destino não encontrada (key=${targetRootKey}).`);
    }

    const rows = await Zotero.DB.queryAsync(
      `SELECT collectionID, collectionName, parentCollectionID, key
       FROM collections
       WHERE libraryID = ?
         AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)`,
      [libID]
    );

    const byParent = new Map();
    for (const r of rows) {
      const pid = r.parentCollectionID || 0;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(r);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) =>
        a.collectionName.localeCompare(b.collectionName, "pt-BR", { sensitivity: "base" })
      );
    }

    const eixos = [];
    const leaves = [];
    const allCollectionIDs = new Set([rootCol.id]);
    const byKey = new Map();

    const firstLevel = byParent.get(rootCol.id) || [];
    for (const eixoRow of firstLevel) {
      allCollectionIDs.add(eixoRow.collectionID);
      const secondLevel = byParent.get(eixoRow.collectionID) || [];
      const eixoNode = {
        id: eixoRow.collectionID,
        key: eixoRow.key,
        name: eixoRow.collectionName,
        parentID: rootCol.id,
        parentKey: rootCol.key,
        children: [],
      };
      byKey.set(eixoRow.key, eixoNode);

      if (secondLevel.length === 0) {
        const leaf = await enrichLeaf(eixoRow.collectionID, eixoRow.key, eixoRow.collectionName, null, null);
        eixoNode.isLeaf = true;
        eixoNode.leaf = leaf;
        leaves.push(leaf);
        byKey.set(leaf.key, leaf);
      } else {
        eixoNode.isLeaf = false;
        for (const temaRow of secondLevel) {
          allCollectionIDs.add(temaRow.collectionID);
          const leaf = await enrichLeaf(
            temaRow.collectionID,
            temaRow.key,
            temaRow.collectionName,
            eixoRow.key,
            eixoRow.collectionName
          );
          eixoNode.children.push(leaf);
          leaves.push(leaf);
          byKey.set(leaf.key, leaf);
        }
      }
      eixos.push(eixoNode);
    }

    return {
      libraryID: libID,
      root: {
        id: rootCol.id,
        key: rootCol.key,
        name: rootCol.name,
      },
      eixos,
      leaves,
      allCollectionIDs,
      byKey,
    };
  }

  async function enrichLeaf(collectionID, key, name, parentKey, parentName) {
    const titleRows = await Zotero.DB.queryAsync(
      `SELECT iv.value AS title
       FROM collectionItems ci
       JOIN items i ON i.itemID = ci.itemID
       JOIN itemData id ON id.itemID = i.itemID
       JOIN fields f ON f.fieldID = id.fieldID AND f.fieldName = 'title'
       JOIN itemDataValues iv ON iv.valueID = id.valueID
       WHERE ci.collectionID = ?
         AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
       LIMIT 60`,
      [collectionID]
    );

    const tagRows = await Zotero.DB.columnQueryAsync(
      `SELECT DISTINCT t.name
       FROM collectionItems ci
       JOIN itemTags itg ON itg.itemID = ci.itemID
       JOIN tags t ON t.tagID = itg.tagID
       WHERE ci.collectionID = ?
       LIMIT 40`,
      [collectionID]
    );

    return {
      id: collectionID,
      key,
      name,
      parentKey,
      parentName,
      fullLabel: parentName ? `${parentName} > ${name}` : name,
      itemCount: titleRows ? titleRows.length : 0,
      sampleTitles: (titleRows || []).map((r) => r.title).filter(Boolean),
      sampleTags: (tagRows || []).filter((t) => t && !t.startsWith("_")),
    };
  }

  function getItemMetadata(item) {
    if (!item) return null;
    const isRegular = typeof item.isRegularItem === "function" && item.isRegularItem();
    const isAttachment = typeof item.isAttachment === "function" && item.isAttachment();
    let title = "";
    try {
      title = item.getField("title") || "";
    } catch (e) {
      title = "";
    }
    if (!title && isAttachment && typeof item.attachmentFilename === "string") {
      title = item.attachmentFilename;
    }

    let creators = [];
    if (isRegular && typeof item.getCreators === "function") {
      creators = item.getCreators().map((c) => {
        if (c.fieldMode === 1) return c.lastName || "";
        return [c.lastName, c.firstName].filter(Boolean).join(", ");
      });
    }

    const safeField = (name) => {
      if (!isRegular) return "";
      try {
        return item.getField(name) || "";
      } catch (e) {
        return "";
      }
    };

    const tags =
      typeof item.getTags === "function"
        ? item
            .getTags()
            .map((t) => t.tag)
            .filter((t) => t && !t.startsWith("_"))
        : [];

    const dateStr = safeField("date");
    const yearMatch = String(dateStr).match(/\b(1[5-9]\d{2}|20\d{2})\b/);

    return {
      id: item.id,
      key: item.key,
      libraryID: item.libraryID,
      itemType: Zotero.ItemTypes.getName(item.itemTypeID),
      isRegular,
      isAttachment,
      title: String(title).replace(/<\/?i>/gi, "").trim(),
      creators,
      year: yearMatch ? yearMatch[1] : "",
      abstractNote: safeField("abstractNote").slice(0, 1200),
      publicationTitle: safeField("publicationTitle") || safeField("bookTitle") || "",
      publisher: safeField("publisher") || safeField("university") || "",
      language: safeField("language") || "",
      tags,
    };
  }

  function isItemAlreadyInTargetTree(item, targetTree) {
    if (!item || !targetTree || !targetTree.allCollectionIDs) return false;
    const cols = item.getCollections ? item.getCollections() : [];
    for (const cid of cols) {
      if (targetTree.allCollectionIDs.has(cid)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds an existing thematic subcollection for sourceCol:
   * 1. Nested child named "Por Eixo e Tema" or "<SourceName> - Por Eixo e Tema"
   * 2. Sibling under the same parent named "<SourceName> - Por Eixo e Tema"
   * Returns { id, key, name, location: "nested"|"sibling" } or null if none exists yet.
   */
  async function findExistingTargetForSource(libraryID, sourceKey) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const sourceCol = Zotero.Collections.getByLibraryAndKey(libID, sourceKey);
    if (!sourceCol) return null;

    const rows = await Zotero.DB.queryAsync(
      `SELECT collectionID, collectionName, parentCollectionID, key
       FROM collections
       WHERE libraryID = ?
         AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)`,
      [libID]
    );
    if (!rows || rows.length === 0) return null;

    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const srcNorm = norm(sourceCol.name);
    const isThematicChildName = (name) => {
      const n = norm(name);
      return (
        n === "por eixo e tema" ||
        n === "por eixos e temas" ||
        n === "eixos e temas" ||
        n === `${srcNorm} - por eixo e tema` ||
        n.endsWith(" - por eixo e tema")
      );
    };

    // 1. Check nested child inside sourceCol
    const nested = rows.find(
      (r) => r.parentCollectionID === sourceCol.id && isThematicChildName(r.collectionName)
    );
    if (nested) {
      return {
        id: nested.collectionID,
        key: nested.key,
        name: nested.collectionName,
        location: "nested",
      };
    }

    // 2. Check sibling under same parent (e.g. Daniel/Livros -> Daniel/Livros - Por Eixo e Tema)
    const srcParent = sourceCol.parentID || null;
    const sibling = rows.find(
      (r) =>
        (r.parentCollectionID || null) === srcParent &&
        r.key !== sourceCol.key &&
        norm(r.collectionName) === `${srcNorm} - por eixo e tema`
    );
    if (sibling) {
      return {
        id: sibling.collectionID,
        key: sibling.key,
        name: sibling.collectionName,
        location: "sibling",
      };
    }

    return null;
  }

  /**
   * Ensures a thematic root subcollection exists inside sourceCol (or reuses existing).
   */
  async function ensureTargetRootInsideSource(libraryID, sourceKey, customName) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const sourceCol = Zotero.Collections.getByLibraryAndKey(libID, sourceKey);
    if (!sourceCol) {
      throw new Error(`Coleção de origem não encontrada (key=${sourceKey}).`);
    }
    const defaultName = `${sourceCol.name} - Por Eixo e Tema`;
    const name = String(customName || defaultName).trim() || defaultName;
    return getOrCreateSubcollection(libID, sourceCol.id, name);
  }

  /**
   * Lists direct pending items in sourceCol (optionally skipping items already in targetTree).
   * Works even when targetTree is null (destination subcollection not created yet).
   */
  async function getPendingItemsForPlanning(libraryID, sourceKey, targetTree, skipAlreadyClassified) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const sourceCol = Zotero.Collections.getByLibraryAndKey(libID, sourceKey);
    if (!sourceCol) {
      throw new Error(`Coleção de origem não encontrada (key=${sourceKey}).`);
    }
    const childItemIDs = sourceCol.getChildItems(true);
    const pending = [];

    for (const id of childItemIDs) {
      const item = await Zotero.Items.getAsync(id);
      if (!item || item.deleted) continue;
      if (item.isNote && item.isNote()) continue;
      if (item.isAttachment && item.isAttachment() && item.parentItemID) continue;
      if (skipAlreadyClassified && targetTree && isItemAlreadyInTargetTree(item, targetTree)) {
        continue;
      }
      pending.push(item);
    }
    return { sourceCol, pending };
  }

  async function getOrCreateSubcollection(libraryID, parentID, name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Nome da subcoleção vazio.");

    const existingID = await Zotero.DB.valueQueryAsync(
      `SELECT collectionID FROM collections
       WHERE libraryID = ?
         AND parentCollectionID = ?
         AND collectionName = ?
         AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)`,
      [libraryID, parentID, cleanName]
    );
    if (existingID) {
      return Zotero.Collections.get(existingID);
    }

    const col = new Zotero.Collection();
    col.libraryID = libraryID;
    col.parentID = parentID;
    col.name = cleanName;
    await col.saveTx();
    return col;
  }

  /**
   * Strictly NON-DESTRUCTIVE: only creates requested subcollections and ADDS item to collections.
   * Never deletes collections, never removes item from source collection, never touches files.
   */
  async function applyClassification(item, libraryID, targetRootKey, selectedKeys, newSubcollections) {
    const libID = libraryID || item.libraryID || Zotero.Libraries.userLibraryID;
    const rootCol = Zotero.Collections.getByLibraryAndKey(libID, targetRootKey);
    if (!rootCol) {
      throw new Error(`Coleção destino não encontrada (key=${targetRootKey}).`);
    }

    const targetIDs = new Set();
    const createdNames = [];
    const linkedNames = [];

    for (const key of selectedKeys || []) {
      const col = Zotero.Collections.getByLibraryAndKey(libID, key);
      if (col) {
        targetIDs.add(col.id);
        linkedNames.push(col.name);
      }
    }

    for (const spec of newSubcollections || []) {
      if (!spec || !spec.name || !String(spec.name).trim()) continue;
      let parentID = rootCol.id;
      if (spec.parentKey && spec.parentKey !== "__ROOT__" && spec.parentKey !== rootCol.key) {
        const pCol = Zotero.Collections.getByLibraryAndKey(libID, spec.parentKey);
        if (pCol) parentID = pCol.id;
      }
      const newCol = await getOrCreateSubcollection(libID, parentID, spec.name);
      targetIDs.add(newCol.id);
      createdNames.push(newCol.name);
      linkedNames.push(newCol.name);
    }

    if (targetIDs.size === 0) {
      return { changed: false, createdNames: [], linkedNames: [] };
    }

    const currentCols = new Set(item.getCollections());
    let changed = false;
    for (const cid of targetIDs) {
      if (!currentCols.has(cid)) {
        item.addToCollection(cid);
        changed = true;
      }
    }

    if (changed) {
      await item.saveTx();
    }

    return {
      changed,
      createdNames,
      linkedNames,
    };
  }

  async function getPendingItemsInSource(libraryID, sourceKey, targetRootKey, skipAlreadyClassified) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const sourceCol = Zotero.Collections.getByLibraryAndKey(libID, sourceKey);
    if (!sourceCol) {
      throw new Error(`Coleção de origem não encontrada (key=${sourceKey}).`);
    }
    const targetTree = await getTargetTree(libID, targetRootKey);
    const childItemIDs = sourceCol.getChildItems(true);
    const pending = [];

    for (const id of childItemIDs) {
      const item = await Zotero.Items.getAsync(id);
      if (!item || item.deleted) continue;
      if (item.isNote && item.isNote()) continue;
      if (item.isAttachment && item.isAttachment() && item.parentItemID) continue;
      if (skipAlreadyClassified && isItemAlreadyInTargetTree(item, targetTree)) {
        continue;
      }
      pending.push(item);
    }
    return { sourceCol, targetTree, pending };
  }

  return {
    listAllCollections,
    getTargetTree,
    getItemMetadata,
    isItemAlreadyInTargetTree,
    findExistingTargetForSource,
    ensureTargetRootInsideSource,
    getOrCreateSubcollection,
    applyClassification,
    getPendingItemsInSource,
    getPendingItemsForPlanning,
  };
})();
