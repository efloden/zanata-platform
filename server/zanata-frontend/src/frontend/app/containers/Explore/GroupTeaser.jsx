import React from 'react'
import PropTypes from 'prop-types'
import { Link, Icon } from '../../components'
import { serverUrl } from '../../config'

const statusIcons = {
  ACTIVE: '',
  READONLY: 'locked',
  OBSOLETE: 'trash'
}
/**
 * Entry of Version Group search results
 */
const GroupTeaser = ({
  details,
  name,
  ...props
}) => {
  const status = statusIcons[details.status]
  const description = details.description
    ? (<div className='text-muted'>
      {details.description}
    </div>)
    : (<div className='text-muted'>
      <em>Group : {details.id}</em>
    </div>)
  const metaData = details.owner ? (
    <div className='meta-info'>
      <Icon name='user' className='n1 usericon-muted' />
      <Link to={details.owner}>{details.owner}</Link>
      <Icon name='users' className='usersicon-muted n1' />
    </div>
  ) : undefined
  const link = serverUrl + '/version-group/view/' + details.id
  const className = status !== statusIcons.ACTIVE
                  ? 'text-muted-bold'
                  : 'text-bold'
  return (
    <div className='teaser-view-theme' name={name}>
      {/* <View className='Mend(rh)'>
        TODO: Statistics Donut here
      </View> */}
      <div className='teaser-inner'>
        <div>
          <Link link={link} useHref className={className}>
            {status !== statusIcons.ACTIVE &&
            (<Icon name={statusIcons[details.status]} className='s1 statusicons'
            />)}
            {details.title}
          </Link>
          {description}
        </div>
        {metaData}
      </div>
    </div>
  )
}

GroupTeaser.propTypes = {
  /**
   * Entry of the search results.
   */
  details: PropTypes.shape({
    id: PropTypes.string,
    status: PropTypes.string,
    description: PropTypes.string,
    title: PropTypes.string
  }),
  /**
   * Name for the component
   */
  name: PropTypes.string
}

export default GroupTeaser
