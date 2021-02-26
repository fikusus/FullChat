const users = [];

const  addUser = async({ id, name, room }) => {
  name = name.trim();
  room = room.trim();

  if (!name || !room) return { error: "Username and room are required." };
  const user = { id, name, room, opend: true };

  users.push(user);
  return { user };
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = async(id) => users.find((user) => user.id === id);

const getUsersInRoom = (room) => users.filter((user) => user.room === room);


module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
};
