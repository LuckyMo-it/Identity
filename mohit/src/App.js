import React, { useState } from 'react';
import {Button,FormControl,Input,InputLabel} from '@mui/material';
import './App.css';


function App() {
  const [todos,setTodos]=useState(['make a react firebase project',
    'record a coding video'
  ])
  const [input,setInput]=useState('');
  const addTodo=e=>{
    e.preventDefault()
    setTodos([...todos,input])
    setInput('')
  }
  return (
    <div className="App">
      <h1>todo</h1>
      <form>
        <FormControl>
          <InputLabel>Write a Todo</InputLabel>
          
        <Input value={input} onChange={e=>setInput(e.target.value)}/>
        </FormControl>
        <Button type="submit" onClick={addTodo} variant="contained"
        color="primary" disabled={!input}>Add Todo</Button>
      </form>
      <ul>
        {todos.map(todo=><li>{todo}</li>)}
      </ul>
    </div>
  );
}

export default App;
