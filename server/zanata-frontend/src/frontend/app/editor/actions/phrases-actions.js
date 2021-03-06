import { fetchPhraseList, fetchPhraseDetail, savePhrase } from '../api'
import { toggleDropdown } from '.'
import { fill, get, isUndefined, mapValues, slice } from 'lodash'
import {
  FETCHING_PHRASE_LIST,
  PHRASE_LIST_FETCHED,
  PHRASE_LIST_FETCH_FAILED,
  FETCHING_PHRASE_DETAIL,
  PHRASE_DETAIL_FETCHED,
  PHRASE_DETAIL_FETCH_FAILED,
  COPY_FROM_SOURCE,
  COPY_FROM_ALIGNED_SOURCE,
  CANCEL_EDIT,
  UNDO_EDIT,
  SELECT_PHRASE,
  SELECT_PHRASE_SPECIFIC_PLURAL,
  PHRASE_TEXT_SELECTION_RANGE,
  TRANSLATION_TEXT_INPUT_CHANGED,
  QUEUE_SAVE,
  SAVE_INITIATED,
  PENDING_SAVE_INITIATED,
  SAVE_FINISHED
} from './phrases-action-types'
import {
  defaultSaveStatus,
  STATUS_NEW,
  STATUS_UNTRANSLATED,
  STATUS_NEEDS_WORK,
  STATUS_NEEDS_WORK_SERVER
} from '../utils/status-util'
import { hasTranslationChanged } from '../utils/phrase-util'

// API lookup of the list of phrase id + phrase status for the current document
export function requestPhraseList (projectSlug, versionSlug, lang, docId,
                                   paging) {
  return (dispatch, getState) => {
    dispatch({ type: FETCHING_PHRASE_LIST })

    if (isUndefined(lang)) {
      // cannot request phrases without a language
      dispatch(phraseListFetchFailed(
        new Error('No language selected, cannot fetch phrases.')))
      return
    }

    fetchPhraseList(projectSlug, versionSlug, lang, docId)
      .then(response => {
        if (isErrorResponse(response)) {
          // TODO error detail from actual response object
          dispatch(phraseListFetchFailed(
            new Error('Failed to fetch phrase list')))
          // can also throw to fail the promise
          return Promise.reject('')
        }
        return response.json()
      })
      .then(statusList => {
        // TODO statusList has status format from server, convert
        dispatch(phraseListFetched(docId, statusList, statusList.map(phrase => {
          return {
            ...phrase,
            status: transUnitStatusToPhraseStatus(phrase.status)
          }
        })))
        dispatch(fetchPhraseDetails(statusList, lang, paging))
      })
  }
}

export function fetchPhraseDetails (statusList, language, paging) {
  return (dispatch) => {
    const startIndex = paging.pageIndex * paging.countPerPage
    const endIndex = paging.countPerPage + startIndex
    const ids = slice(statusList, startIndex, endIndex).map(phrase => {
      return phrase.id
    })
    dispatch(requestPhraseDetail(language, ids))
  }
}

// new phrase list has been fetched from API
export function phraseListFetched (docId, statusList, phraseList) {
  return {
    type: PHRASE_LIST_FETCHED,
    docId: docId,
    phraseList: phraseList,
    statusList: statusList
  }
}

export function phraseListFetchFailed (error) {
  return { type: PHRASE_LIST_FETCH_FAILED, error: error }
}

// API lookup of the detail for a given set of phrases (by id)
export function requestPhraseDetail (localeId, phraseIds) {
  return (dispatch, getState) => {
    dispatch({ type: FETCHING_PHRASE_DETAIL })
    fetchPhraseDetail(localeId, phraseIds)
      .then(response => {
        if (isErrorResponse(response)) {
          // TODO error info from actual response object
          dispatch(phraseDetailFetchFailed(
            new Error('Failed to fetch phrase detail')))
        }
        return response.json()
      })
      .then(transUnitDetail => {
        const locale = get(getState(),
            ['headerData', 'context', 'projectVersion', 'locales', localeId],
            // default value if locale object cannot be found
            { id: localeId })
        dispatch(
          phraseDetailFetched(
            // phraseDetail
            transUnitDetailToPhraseDetail(transUnitDetail, locale)
          )
        )
      })
  }
}

/**
 * Convert the TransUnit response objects to the Phrase structure that
 * is needed for the component tree.
 */
function transUnitDetailToPhraseDetail (transUnitDetail, locale) {
  const localeId = locale.id
  const nplurals = locale.nplurals || 1
  return mapValues(transUnitDetail, (transUnit, index) => {
    const {
      content,
      contents,
      id,
      msgctxt,
      plural,
      sourceComment,
      sourceFlags,
      sourceReferences,
      wordCount
    } = transUnit.source
    const trans = transUnit[localeId]
    const status = transUnitStatusToPhraseStatus(trans && trans.state)
    const translations = extractTranslations(trans)
    const emptyTranslations = Array(plural ? nplurals : 1)
    fill(emptyTranslations, '')
    const newTranslations =
        status === STATUS_UNTRANSLATED ? emptyTranslations : [...translations]

    return {
      id: parseInt(index, 10),
      resId: id,
      msgctxt,
      sourceComment,
      sourceFlags,
      sourceReferences,
      plural,
      sources: plural ? contents : [content],
      translations,
      newTranslations,
      status,
      revision: trans && trans.revision ? parseInt(trans.revision, 10) : 0,
      wordCount: parseInt(wordCount, 10),
      lastModifiedBy: trans && trans.translator && trans.translator.name,
      lastModifiedTime: trans && trans.lastModifiedTime &&
        new Date(trans.lastModifiedTime)
    }
  })
}

/**
 * Get translations from a TransUnit in a consistent form (array of strings)
 *
 * This will always return an Array<String>, but the array may be empty.
 */
function extractTranslations (trans) {
  if (!trans) {
    return []
  }
  return trans.content ? [trans.content]
    // Array.slice() efficiently makes a copy of the array.
    : (trans.contents ? trans.contents.slice() : [])
}

/**
 * Correct the incoming status keys to match what is expected in
 * the app. No status is assumed to mean new.
 *
 * Expect: untranslated/needswork/translated/approved
 */
function transUnitStatusToPhraseStatus (mixedCaseStatus) {
  const status = mixedCaseStatus && mixedCaseStatus.toLowerCase()
  if (!status || status === STATUS_NEW) {
    return STATUS_UNTRANSLATED
  }
  if (status === STATUS_NEEDS_WORK_SERVER) {
    return STATUS_NEEDS_WORK
  }
  // remaining status should be ok just lowercased
  return status
}

// detail for phrases has been fetched from API
export function phraseDetailFetched (phrases) {
  return { type: PHRASE_DETAIL_FETCHED, phrases: phrases }
}

export function phraseDetailFetchFailed (error) {
  return { type: PHRASE_DETAIL_FETCH_FAILED, error: error }
}

/**
 * Copy from source text to the focused translation input.
 * Only change the input text, not the saved translation value.
 */
export function copyFromSource (phraseId, sourceIndex) {
  return { type: COPY_FROM_SOURCE,
           phraseId: phraseId,
           sourceIndex: sourceIndex
         }
}

/**
 * Copy the source that is at the same plural index to the focused translation
 * plural. If there are not enough source plural forms, the highest one is used.
 */
export function copyFromAlignedSource () {
  return { type: COPY_FROM_ALIGNED_SOURCE }
}

/**
 * Stop editing the currently focused phrase and discard all entered text.
 * After this action, no phrase should be in editing state.
 */
export function cancelEdit () {
  return {
    type: CANCEL_EDIT
  }
}

/**
 * Discard all entered text for the currently selected phrase, reverting to
 * whatever translations are currently saved.
 * After this action, a phrase may still be in editing state.
 */
export function undoEdit () {
  return {
    type: UNDO_EDIT
  }
}

/**
 * Set the selected phrase to the given ID.
 * Only one phrase is selected at a time.
 */
export function selectPhrase (phraseId) {
  return (dispatch) => {
    dispatch(savePreviousPhraseIfChanged(phraseId))
    dispatch({type: SELECT_PHRASE, phraseId})
  }
}

/**
 * Select a phrase and set which of its plurals is selected.
 * The selected plural index should persist even when the phrase loses focus
 * and gains it back again (unless it gains focus from a different plural form
 * being specifically targeted).
 */
export function selectPhrasePluralIndex (phraseId, index) {
  return (dispatch) => {
    dispatch(savePreviousPhraseIfChanged(phraseId))
    dispatch({ type: SELECT_PHRASE_SPECIFIC_PLURAL, phraseId, index })
  }
}

function savePreviousPhraseIfChanged (phraseId) {
  return (dispatch, getState) => {
    const previousPhraseId = getState().phrases.selectedPhraseId
    if (previousPhraseId && previousPhraseId !== phraseId) {
      const previousPhrase = getState().phrases.detail[previousPhraseId]
      if (previousPhrase && hasTranslationChanged(previousPhrase)) {
        dispatch(savePhraseWithStatus(previousPhrase,
          defaultSaveStatus(previousPhrase)))
      }
    }
  }
}

/**
 * Use to broadcast the cursor location or selection within the focused
 * translation text.
 *
 * @param start position of cursor or beginning of range
 * @param end position of cursor (if no range is selected) or end of range
 */
export function phraseTextSelectionRange (start, end) {
  return {
    type: PHRASE_TEXT_SELECTION_RANGE,
    payload: {
      start,
      end
    }
  }
}

// User has typed/pasted/etc. text for a translation (not saved yet)
export function translationTextInputChanged (id, index, text) {
  return {
    type: TRANSLATION_TEXT_INPUT_CHANGED,
    id: id,
    index: index,
    text: text
  }
}

export function savePhraseWithStatus (phrase, status) {
  return (dispatch, getState) => {
    // save dropdowns (and others) should always close when save starts.
    dispatch(toggleDropdown(undefined))

    const stateBefore = getState()
    const saveInfo = {
      localeId: stateBefore.context.lang,
      status,
      translations: phrase.newTranslations
    }

    const inProgressSave =
      stateBefore.phrases.detail[phrase.id].inProgressSave

    if (inProgressSave) {
      dispatch(queueSave(phrase.id, saveInfo))
      // done for now, save will initiate when inProgressSave completes
      return
    }

    doSave(saveInfo)

    /**
     * Perform a save with the given info, and recursively start next save if
     * one has queued when the save finishes.
     */
    function doSave (saveInfo) {
      // fetch a new phrase copy each time so revision and queued saves are
      // are correct.
      const currentPhrase = getState().phrases.detail[phrase.id]
      dispatch(saveInitiated(phrase.id, saveInfo))
      savePhrase(currentPhrase, saveInfo)
        .then(response => {
          if (isErrorResponse(response)) {
            console.error('Failed to save phrase')
            // TODO dispatch an error about save failure
            //      this should remove the inProgressSave data
            // FIXME make phraseSaveFailed exist
            // dispatch(phraseSaveFailed(currentPhrase, saveInfo))
          } else {
            response.json().then(({ revision, status }) => {
              dispatch(saveFinished(phrase.id, status, revision))
            })
          }
          startPendingSaveIfPresent(currentPhrase)
        })
    }

    function startPendingSaveIfPresent (currentPhrase) {
      const pendingSave = currentPhrase.pendingSave
      if (pendingSave) {
        dispatch(pendingSaveInitiated(currentPhrase.id))
        doSave(pendingSave)
      }
    }
  }
}

function queueSave (phraseId, saveInfo) {
  return {
    type: QUEUE_SAVE,
    phraseId,
    saveInfo
  }
}

function saveInitiated (phraseId, saveInfo) {
  return {
    type: SAVE_INITIATED,
    phraseId,
    saveInfo
  }
}

function pendingSaveInitiated (phraseId) {
  return {
    type: PENDING_SAVE_INITIATED,
    phraseId
  }
}

// FIXME should use status and serverStatus to disambiguate
//       (these would be separate types if there were types.)
function saveFinished (phraseId, transUnitStatus, revision) {
  return {
    type: SAVE_FINISHED,
    phraseId,
    status: transUnitStatusToPhraseStatus(transUnitStatus),
    revision
  }
}

function isErrorResponse (response) {
  return response.status >= 400
}
