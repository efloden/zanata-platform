import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {
  Button, InputGroup, FormGroup, FormControl,
  Badge, Pagination
} from 'react-bootstrap'
import Helmet from 'react-helmet'
import {debounce, find} from 'lodash'
import Entry from './Entry'
import NewLanguageModal from './NewLanguageModal'
import {Icon, Notification, LoaderText} from '../../components'

import {
  initialLoad,
  handleDelete,
  handleUpdatePageSize,
  handleUpdateSort,
  handleUpdateSearch,
  handlePageUpdate,
  handleNewLanguageDisplay,
  pageSizeOption,
  sortOption
} from '../../actions/languages-actions'

class Languages extends Component {
  static propTypes = {
    page: PropTypes.number,
    notification: PropTypes.object,
    permission: PropTypes.object,
    user: PropTypes.object,
    searchText: PropTypes.string,
    size: PropTypes.number,
    sort: PropTypes.object,
    results: PropTypes.array,
    totalCount: PropTypes.number,
    loading: PropTypes.bool,
    deleting: PropTypes.bool,
    handleInitLoad: PropTypes.func,
    handleDelete: PropTypes.func,
    handleOnUpdatePageSize: PropTypes.func,
    handleOnUpdateSort: PropTypes.func,
    handleOnUpdateSearch: PropTypes.func,
    handlePageChanged: PropTypes.func,
    handleOnDisplayNewLanguage: PropTypes.func
  }

  constructor (props) {
    super(props)
    this.state = {
      searchText: props.searchText
    }
    // Debounce works when you call it once, then use the returned function
    // multiple times.
    // Do not extract this to a function like `() => { debounce(...) }` since
    // that would make a new debounced function instance on every call.
    this.handleUpdateSearch = debounce(props.handleOnUpdateSearch, 200)
  }

  componentDidMount () {
    this.props.handleInitLoad()
  }

  resetSearchText = (localeId) => {
    this.setState({
      searchText: ''
    })
    this.props.handleDelete(localeId)
  }

  onUpdateSearch = (event) => {
    const searchText = event.target.value || ''
    this.setState({
      searchText
    })
    this.handleUpdateSearch(searchText)
  }

  render () {
    const {
      size,
      sort,
      page,
      results,
      totalCount,
      permission,
      user,
      loading,
      deleting,
      notification,
      handleOnUpdatePageSize,
      handleOnUpdateSort,
      handlePageChanged,
      handleOnDisplayNewLanguage
    } = this.props

    const resetSearchText = this.resetSearchText

    const totalPage = Math.floor(totalCount / size) +
      (totalCount % size > 0 ? 1 : 0)

    /* eslint-disable react/jsx-no-bind */
    return (
      <div className='page wide-view-theme'>
        {notification &&
        (<Notification severity={notification.severity}
          message={notification.message}
          details={notification.details}
          show={!!notification} />
        )
        }
        <Helmet title='Languages' />
        <div className='center-block'>
          <div className='clearfix'
            id='languages-form'>
            <h2>
              Languages {!loading &&
                <Badge className='default'>{totalCount}</Badge>}
            </h2>
            {permission.canAddLocale &&
              <div>
                <Button bsStyle='primary' bsSize='small'
                  id='btn-language-add-new'
                  onClick={handleOnDisplayNewLanguage}>
                  <Icon name='plus' className='n1 plusicon'
                    title='plus' />
                  Add new language
                </Button>
                <NewLanguageModal />
              </div>
            }
            <div className='toolbar col-xs-12'>
              <FormGroup className='search-box col-xs-6 col-sm-5 col-md-6
                col-lg-7'>
                <InputGroup>
                  <FormControl type='text'
                    value={this.state.searchText}
                    onChange={this.onUpdateSearch} />
                  <InputGroup.Addon>
                    <Icon name='search'
                      className='s1'
                      title='search' />
                  </InputGroup.Addon>
                </InputGroup>
              </FormGroup>

              {loading
                ? <div className='content-view-container'>
                  <span className='list-inline'>
                    <LoaderText loading />
                  </span>
                </div>
                : (<div>
                  <div className='sort-items
                    col-xs-6 col-sm-4 col-md-4 col-lg-3'>
                    <FormControl componentClass='select'
                      className='pull-right' id='sort-options'
                      onChange={handleOnUpdateSort} value={sort.value}>
                    {sortOption.map(function (sort, i) {
                      return <option key={i} value={sort.value}>
                        {sort.display}</option>
                    })}
                    </FormControl>
                  </div>
                  <div className='show-items pull-right col-xs-5
                    col-sm-3 col-md-2 col-lg-2'>
                    <span>Show</span>
                    <FormControl componentClass='select'
                      onChange={handleOnUpdatePageSize} value={size}
                      id='page-size-options'>
                    {pageSizeOption.map(function (value, i) {
                      return <option key={i} value={value}>
                        {value}</option>
                    })}
                    </FormControl>
                  </div>
                  <div className='page-count col-xs-7 col-sm-8
                    col-md-12'>
                    <Pagination
                      prev
                      next
                      bsSize='medium'
                      items={totalPage}
                      activePage={page}
                      onSelect={handlePageChanged} />
                  </div>
                </div>)
              }
            </div>
            {!loading &&
              <div className='left-form tablepadding col-xs-12'>
                <table className='table' id='languages-table'>
                  <thead>
                    <tr className='hidden'>
                      <th>Language</th>
                      <th>&nbsp;</th>
                      <th>&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(function (value, i) {
                      return <Entry key={i} locale={value}
                        userLanguageTeams={user.languageTeams}
                        permission={permission}
                        handleDelete={resetSearchText}
                        isDeleting={deleting} />
                    })}
                  </tbody>
                </table>
              </div>}
          </div>
        </div>
      </div>
    )
    /* eslint-enable react/jsx-no-bind */
  }
}

const mapStateToProps = (state, { location }) => {
  let urlSort = location.query.sort
  if (urlSort) {
    urlSort = find(sortOption, function (sort) {
      return sort.value === urlSort
    })
    if (!urlSort) {
      urlSort = sortOption[0]
    }
  } else {
    urlSort = sortOption[0]
  }

  const {
    locales,
    loading,
    permission,
    user,
    notification,
    deleting
  } = state.languages
  return {
    searchText: location.query.search || '',
    page: parseInt(location.query.page) || 1,
    size: parseInt(location.query.size) || pageSizeOption[0],
    sort: urlSort,
    results: locales.results,
    totalCount: locales.totalCount,
    loading,
    permission,
    user,
    notification,
    deleting
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleInitLoad: () => {
      dispatch(initialLoad())
    },
    handleDelete: (localeId) => {
      dispatch(handleDelete(localeId))
    },
    handleOnUpdatePageSize: (event) => {
      dispatch(handleUpdatePageSize(event.target.value || ''))
    },
    handleOnUpdateSort: (event) => {
      dispatch(handleUpdateSort(event.target.value || ''))
    },
    handleOnUpdateSearch: (val) => {
      dispatch(handleUpdateSearch(val))
    },
    handlePageChanged: (page) => {
      dispatch(handlePageUpdate(page))
    },
    handleOnDisplayNewLanguage: () => {
      dispatch(handleNewLanguageDisplay(true))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Languages)
