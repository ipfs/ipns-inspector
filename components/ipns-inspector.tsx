import React from 'react'
import { useMachine } from '@xstate/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserInspector } from '@statelyai/inspect'
import { ipnsMachine, Mode } from '../lib/ipns-machine'
import { Spinner } from './ui/spinner'
import { KeyRound } from 'lucide-react'

const MIN_SEQUENCE = 0
const MAX_VALIDITY = 365 * 24 * 60 * 60 // 1 year in seconds

const inspector = createBrowserInspector({
  autoStart: false,
})

interface RecordFieldProps {
  label: string;
  value: string;
  monospace?: boolean;
}



// Simplified component
export default function IPNSInspector() {
  const [state, send] = useMachine(ipnsMachine, {
    inspect: inspector?.inspect,
  })
  const isLoading = state.value === 'init'
  console.log(state.value)
  console.log(state.context)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>IPNS Record Inspector & Creator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={state.value}
          onValueChange={(value) => send({ type: 'UPDATE_MODE', value: value as Mode })}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="inspect">Inspect Record</TabsTrigger>
            <TabsTrigger value="create">Create Record</TabsTrigger>
          </TabsList>

          {state.value === 'init' && <div>Loading...</div>}

          <TabsContent value="inspect">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">IPNS Name</label>
                <div className="flex gap-2">
                  <Input
                    value={state.context.nameToInspect}
                    onChange={(e) => send({ type: 'UPDATE_NAME', value: e.target.value })}
                    placeholder="k51... or 12D..."
                  />
                  {
                    <Button
                      onClick={() => send({ type: 'INSPECT_NAME' })}
                      disabled={
                        isLoading ||
                        state.context.nameValidationError != null ||
                        state.context.nameToInspect.length === 0
                      }
                    >
                      Fetch Record {state.context.fetchingRecord ? <Spinner /> : null}
                    </Button>
                  }
                </div>
                {state.context.nameValidationError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{state.context.nameValidationError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="create">
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium">Private Key (base64)</label>
              <div className="flex gap-2 items-center">
                <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto flex-1">
                  <span>{state.context.keypair?.raw.toBase64() ?? 'Generating key...'}</span>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => send({ type: 'GENERATE_NEW_KEY' })}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Value</label>
                <Input
                  value={state.context.formData.value}
                  onChange={(e) => send({ type: 'UPDATE_FORM', field: 'value', value: e.target.value })}
                  placeholder="CID or path to publish"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">TTL (seconds)</label>
                <Input
                  type="number"
                  value={state.context.formData.ttl}
                  onChange={(e) => send({ type: 'UPDATE_FORM', field: 'ttl', value: e.target.value })}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Validity (seconds)</label>
                <Input
                  type="number"
                  value={state.context.formData.validity}
                  onChange={(e) => send({ type: 'UPDATE_FORM', field: 'validity', value: e.target.value })}
                  min="1"
                  max={MAX_VALIDITY}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Sequence Number</label>
                <Input
                  type="number"
                  value={state.context.formData.sequence}
                  onChange={(e) => send({ type: 'UPDATE_FORM', field: 'sequence', value: e.target.value })}
                  min={MIN_SEQUENCE}
                />
              </div>

              <Button onClick={() => send({ type: 'CREATE' })} disabled={isLoading} className="w-full">
                Create Record
              </Button>
            </div>
          </TabsContent>

          {state.context.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{state.context.error.toString()}</AlertDescription>
            </Alert>
          )}

          {state.context.record && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2 break-all">Name: {state.context.nameInspecting}</h3>
              <h3 className="font-medium mb-2">
                IPNS Record Version: {state.context.record.hasOwnProperty('signatureV1') ? 'V1+V2' : 'V2'}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <RecordField label="Value" value={state.context.record.value} />
                <RecordField label="Validity Type" value={state.context.record.validityType} />
                <RecordField label="Validity" value={state.context.record.validity} />
                <RecordField label="Sequence" value={state.context.record.sequence.toString()} />
                <RecordField 
                  label="TTL" 
                  value={state.context.record.ttl ? (Number(state.context.record.ttl) / 1e9).toString() + ' seconds' : 'Not set'} 
                />
                <RecordField 
                  label="Signature V2" 
                  value={state.context.record.signatureV2.toBase64()}
                  monospace
                />
                <RecordField 
                  label="Data" 
                  value={state.context.record.data.toBase64()}
                  monospace
                />
              </div>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

const RecordField: React.FC<RecordFieldProps> = ({ label, value, monospace }) => (
  <div className="border rounded p-3 bg-white">
    <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
    <div className={`break-all ${monospace ? 'font-mono text-sm' : ''}`}>
      {value}
    </div>
  </div>
);

