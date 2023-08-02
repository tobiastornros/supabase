import { PermissionAction } from '@supabase/shared-types/out/constants'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'

import { useParams } from 'common'
import { untitledSnippetTitle } from 'components/interfaces/SQLEditor/SQLEditor.constants'
import { createSqlSnippetSkeleton } from 'components/interfaces/SQLEditor/SQLEditor.utils'
import ProductMenuItem from 'components/ui/ProductMenu/ProductMenuItem'
import ShimmeringLoader from 'components/ui/ShimmeringLoader'
import { SqlSnippet, useSqlSnippetsQuery } from 'data/content/sql-snippets-query'
import { useCheckPermissions, useStore } from 'hooks'
import { uuidv4 } from 'lib/helpers'
import { useProfile } from 'lib/profile'
import { useSnippets, useSqlEditorStateSnapshot } from 'state/sql-editor'
import { Button, cn, IconSearch, IconX, Input, Menu } from 'ui'
import QueryItem from './QueryItem'

const SideBarContent = observer(() => {
  const { ui } = useStore()
  const { ref, id } = useParams()
  const router = useRouter()
  const { profile } = useProfile()

  const [personalSnippetsFilterString, setPersonalSnippetsFilterString] = useState('')
  const [projectSnippetsFilterString, setProjectSnippetsFilterString] = useState('')
  const [favoritesFilterString, setFavoritesFilterString] = useState('')
  const [isPersonalSnippetsFilterOpen, setIsPersonalSnippetsFilterOpen] = useState(false)
  const [isProjectSnippetsFilterOpen, setIsProjectSnippetsFilterOpen] = useState(false)
  const [isFavoritesFilterOpen, setIsFavoritesFilterOpen] = useState(false)

  const snap = useSqlEditorStateSnapshot()
  const { isLoading, isSuccess } = useSqlSnippetsQuery(ref, {
    refetchOnWindowFocus: false,
    staleTime: 300, // 5 minutes
    onSuccess(data) {
      if (ref) snap.setRemoteSnippets(data.snippets, ref)
    },
  })

  const snippets = useSnippets(ref)

  const projectSnippets = useMemo(() => {
    return snippets.filter((snippet) => snippet.visibility === 'project')
  }, [snippets])

  const filteredProjectSnippets = useMemo(() => {
    if (projectSnippetsFilterString.length > 0) {
      return projectSnippets.filter((tab) =>
        tab.name.toLowerCase().includes(projectSnippetsFilterString.toLowerCase())
      )
    }
    return projectSnippets
  }, [projectSnippets, projectSnippetsFilterString])

  const personalSnippets = useMemo(() => {
    const ss = snippets.filter((snippet) => snippet.visibility === 'user')

    if (personalSnippetsFilterString.length > 0) {
      return ss.filter((tab) =>
        tab.name.toLowerCase().includes(personalSnippetsFilterString.toLowerCase())
      )
    }
    return ss
  }, [personalSnippetsFilterString, snippets])

  const favoriteSnippets = useMemo(() => {
    return snippets.filter((snippet) => snippet.content.favorite)
  }, [snippets])

  const filteredFavoriteSnippets = useMemo(() => {
    if (favoritesFilterString.length > 0) {
      return favoriteSnippets.filter((tab) =>
        tab.name.toLowerCase().includes(favoritesFilterString.toLowerCase())
      )
    }
    return favoriteSnippets
  }, [favoriteSnippets, favoritesFilterString])

  const canCreateSQLSnippet = useCheckPermissions(PermissionAction.CREATE, 'user_content', {
    resource: { type: 'sql', owner_id: profile?.id },
    subject: { id: profile?.id },
  })

  const handleNewQuery = async () => {
    if (!ref) return console.error('Project ref is required')
    if (!canCreateSQLSnippet) {
      return ui.setNotification({
        category: 'info',
        message: 'Your queries will not be saved as you do not have sufficient permissions',
      })
    }

    try {
      const snippet = createSqlSnippetSkeleton({
        name: untitledSnippetTitle,
        owner_id: profile?.id,
      })
      const data = { ...snippet, id: uuidv4() }

      snap.addSnippet(data as SqlSnippet, ref, true)

      router.push(`/project/${ref}/sql/${data.id}`)
      // reset all search inputs when a new query is added
      setPersonalSnippetsFilterString('')
      setProjectSnippetsFilterString('')
      setFavoritesFilterString('')
      setIsPersonalSnippetsFilterOpen(false)
      setIsProjectSnippetsFilterOpen(false)
      setIsFavoritesFilterOpen(false)
    } catch (error: any) {
      ui.setNotification({
        category: 'error',
        message: `Failed to create new query: ${error.message}`,
      })
    }
  }

  return (
    <div className="mt-6">
      <Menu type="pills">
        {isLoading ? (
          <div className="px-5 my-4 space-y-2">
            <ShimmeringLoader />
            <ShimmeringLoader className="w-3/4" />
            <ShimmeringLoader className="w-1/2" />
          </div>
        ) : isSuccess ? (
          <div className="space-y-6">
            <div className="px-3 flex flex-col gap-2">
              <ProductMenuItem
                name="Build a query"
                isActive={id === undefined}
                url={`/project/${ref}/sql`}
              />
              <ProductMenuItem
                name="New empty query"
                isActive={false}
                onClick={() => {
                  handleNewQuery()
                }}
              />
            </div>
            <div className="space-y-6 px-3">
              {favoriteSnippets.length >= 1 && (
                <div className="editor-product-menu">
                  <div className="flex flex-row justify-between">
                    <Menu.Group title="Favorites" />
                    <button
                      className="flex items-center w-4 h-4 cursor-pointer mr-3"
                      onClick={() => {
                        setIsFavoritesFilterOpen(!isFavoritesFilterOpen)
                      }}
                    >
                      <IconSearch
                        className={cn(
                          'w-4',
                          'h-4',
                          'cursor-pointer',
                          isFavoritesFilterOpen ? 'text-scale-1200' : 'text-scale-900'
                        )}
                        onClick={() => {
                          setFavoritesFilterString('')
                          setIsFavoritesFilterOpen((state) => !state)
                        }}
                      />
                    </button>
                  </div>
                  {isFavoritesFilterOpen && (
                    <div className="pl-3 mb-2">
                      <Input
                        autoFocus
                        size="tiny"
                        icon={<IconSearch size="tiny" />}
                        placeholder="Filter"
                        disabled={isLoading}
                        onChange={(e) => setFavoritesFilterString(e.target.value)}
                        value={favoritesFilterString}
                        actions={
                          favoritesFilterString && (
                            <IconX
                              size={'tiny'}
                              className="mr-2 cursor-pointer"
                              onClick={() => setFavoritesFilterString('')}
                            />
                          )
                        }
                      />
                    </div>
                  )}
                  {filteredFavoriteSnippets.length > 0 ? (
                    <div className="space-y-1">
                      {filteredFavoriteSnippets.map((tabInfo) => {
                        const { id } = tabInfo || {}
                        return <QueryItem key={id} tabInfo={tabInfo} />
                      })}
                    </div>
                  ) : (
                    <div className="text text-sm h-32 border border-dashed flex flex-col gap-3 items-center justify-center px-3 mx-3 rounded">
                      <span className="text-lighter">No queries found</span>
                    </div>
                  )}
                </div>
              )}

              {projectSnippets.length >= 1 && (
                <div className="editor-product-menu">
                  <div className="flex flex-row justify-between">
                    <Menu.Group title="Project snippets" />
                    <button
                      className="flex items-center w-4 h-4 cursor-pointer mr-3"
                      onClick={() => {
                        setIsProjectSnippetsFilterOpen(!isProjectSnippetsFilterOpen)
                      }}
                    >
                      <IconSearch
                        className={cn(
                          'w-4',
                          'h-4',
                          'cursor-pointer',
                          isProjectSnippetsFilterOpen ? 'text-scale-1200' : 'text-scale-900'
                        )}
                        onClick={() => {
                          setProjectSnippetsFilterString('')
                          setIsProjectSnippetsFilterOpen((state) => !state)
                        }}
                      />
                    </button>
                  </div>
                  {isProjectSnippetsFilterOpen && (
                    <div className="pl-3 mb-2 mr-3">
                      <Input
                        autoFocus
                        size="tiny"
                        icon={<IconSearch size="tiny" />}
                        placeholder="Filter"
                        disabled={isLoading}
                        onChange={(e) => setProjectSnippetsFilterString(e.target.value)}
                        value={projectSnippetsFilterString}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setIsProjectSnippetsFilterOpen(false)
                            setProjectSnippetsFilterString('')
                          }
                        }}
                        actions={
                          projectSnippetsFilterString && (
                            <IconX
                              size={'tiny'}
                              className="mr-2 cursor-pointer"
                              onClick={() => setProjectSnippetsFilterString('')}
                            />
                          )
                        }
                      />
                    </div>
                  )}
                  {filteredProjectSnippets.length > 0 ? (
                    <div className="space-y-1">
                      {filteredProjectSnippets.map((tabInfo) => {
                        const { id } = tabInfo || {}
                        return <QueryItem key={id} tabInfo={tabInfo} />
                      })}
                    </div>
                  ) : (
                    <div className="text text-sm h-32 border border-dashed flex flex-col gap-3 items-center justify-center px-3 mx-3 rounded">
                      <span className="text-lighter">No queries found</span>
                    </div>
                  )}
                </div>
              )}

              <div className="editor-product-menu">
                <div className="flex flex-row justify-between">
                  <Menu.Group title="Personal SQL snippets" />
                  <button
                    className="flex items-center w-4 h-4 cursor-pointer mr-3"
                    onClick={() => {
                      setIsPersonalSnippetsFilterOpen(!isPersonalSnippetsFilterOpen)
                    }}
                  >
                    <IconSearch
                      className={cn(
                        'w-4',
                        'h-4',
                        'cursor-pointer',
                        isPersonalSnippetsFilterOpen ? 'text-scale-1200' : 'text-scale-900'
                      )}
                      onClick={() => {
                        setPersonalSnippetsFilterString('')
                        setIsPersonalSnippetsFilterOpen((state) => !state)
                      }}
                    />
                  </button>
                </div>
                {isPersonalSnippetsFilterOpen && (
                  <div className="pl-3 mb-2 mr-3">
                    <Input
                      autoFocus
                      size="tiny"
                      icon={<IconSearch size="tiny" />}
                      placeholder="Filter"
                      disabled={isLoading}
                      onChange={(e) => setPersonalSnippetsFilterString(e.target.value)}
                      value={personalSnippetsFilterString}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsPersonalSnippetsFilterOpen(false)
                          setPersonalSnippetsFilterString('')
                        }
                      }}
                      actions={
                        personalSnippetsFilterString && (
                          <IconX
                            size={'tiny'}
                            className="mr-2 cursor-pointer"
                            onClick={() => setPersonalSnippetsFilterString('')}
                          />
                        )
                      }
                    />
                  </div>
                )}
                {personalSnippets.length > 0 ? (
                  <div className="space-y-1 pb-8">
                    {personalSnippets.map((tabInfo) => {
                      const { id } = tabInfo || {}
                      return <QueryItem key={id} tabInfo={tabInfo} />
                    })}
                  </div>
                ) : (
                  <div className="text text-sm h-32 border border-dashed flex flex-col gap-3 items-center justify-center px-3 mx-3 rounded">
                    <span className="text-lighter">No queries found</span>
                    <Button type="default" onClick={() => handleNewQuery()}>
                      New Query
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </Menu>
    </div>
  )
})

export default SideBarContent
