export function DatabaseError(Error) {
  if (["ER_CHECK_CONSTRAINT_VIOLATED", "ER_SIGNAL_EXCEPTION", "ER_DATA_TOO_LONG",
    "ER_TRUNCATED_WRONG_VALUE", "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD", "ER_WARN_DATA_OUT_OF_RANGE"].includes(Error.code)) {
    return Response.json({ success: false, message: "Input violates database validation rules" }, { status: 400 });
  }
  if (Error.code === "ER_NO_REFERENCED_ROW_2") {
    return Response.json({ success: false, message: "A referenced record does not exist" }, { status: 400 });
  }
  if (Error instanceof SyntaxError) {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  return null;
}
