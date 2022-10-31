import React, { useEffect, useState } from 'react'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner'
import { useHttpClient } from '../../shared/hooks/http-hook'
import UsersList from '../components/UsersList'

const Users = () => {

//   const USERS = [
//     {
//     id: 'u1', 
//     name: 'Goku', 
//     image: 'https://www.giantbomb.com/a/uploads/square_medium/15/155548/2294993-goku_ssj1.png',
//     places:3
//   }
// ]
  // const [isLoading, setIsLoading] = useState(false)
  // const [error, setError] = useState()

  const { isLoading, error, sendRequest, clearError } = useHttpClient()
  const [loadedUsers, setLoadedUsers] = useState()

  useEffect(() => {
    const fetchUsers = async () => {
      // setIsLoading(true)
      try{
        const responseData = await sendRequest(process.env.REACT_APP_BACKEND_URL +`/users`)

        // const responseData = await response.json()
        
        // if(!response.ok){
        //     throw new Error(responseData.message)
        // }

        setLoadedUsers(responseData.users)
      }catch(err){
          // setError(err.message)
      }
      // setIsLoading(false)
    }
    fetchUsers()
  }, [sendRequest])

  // const errorHandler = () => {
  //   setError(null)
  // }

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      { isLoading && ( <div className="center">
        <LoadingSpinner />
      </div> )}
      { !isLoading && loadedUsers && <UsersList items={loadedUsers} />}
    </React.Fragment>
  )
}

export default Users