import React from 'react'
import Card from '../../shared/components/UIElements/Card'
import UserItem from './UserItem'
import './UsersList.css'

const UsersList = props => {
    if(props.items.length===0) {
      return(
      <div className='center'> 
        <Card>
            <h2> No Users Found !</h2>
        </Card>
      </div>
      )
    }

    return <ul className='users-lists'>
      {props.items.map((item) => (
      <UserItem 
        key={item.id} 
        id={item.id} 
        image={item.image} 
        name={item.name} 
        placeCount={item.places.length} 
      />
      ))}
    </ul>
}

export default UsersList