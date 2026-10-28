import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buscarLancamentos, type Lancamento } from "../../database/dbGestor/dbFerramentas";

const dinheiro = (v:number) => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function BuscarLancamentos() {
  const router=useRouter(); const [itens,setItens]=useState<Lancamento[]>([]); const [busca,setBusca]=useState(""); const [status,setStatus]=useState("Todos"); const [inicio,setInicio]=useState(""); const [fim,setFim]=useState("");
  useFocusEffect(useCallback(()=>{let ativo=true; buscarLancamentos().then(x=>{if(ativo)setItens(x)}).catch(console.error); return()=>{ativo=false}},[]));
  const filtrados=useMemo(()=>itens.filter(x=>(!busca||`${x.nome} ${x.categoria}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase()))&&(status==="Todos"||x.status===status)&&(!inicio||x.data>=inicio)&&(!fim||x.data<=fim)),[itens,busca,status,inicio,fim]);
  return <SafeAreaView style={s.container}><View style={s.header}><TouchableOpacity onPress={()=>router.back()}><Ionicons name="arrow-back" size={26} color="#222"/></TouchableOpacity><Text style={s.titulo}>Buscar lançamentos</Text></View>
    <TextInput style={s.campo} placeholder="Nome ou categoria" value={busca} onChangeText={setBusca}/>
    <View style={s.filtros}><TextInput style={[s.campo,s.data]} placeholder="De (AAAA-MM-DD)" value={inicio} onChangeText={setInicio}/><TextInput style={[s.campo,s.data]} placeholder="Até (AAAA-MM-DD)" value={fim} onChangeText={setFim}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.opcoes}>{["Todos","Pago","Pendente","Recebido","A receber"].map(x=><TouchableOpacity key={x} onPress={()=>setStatus(x)} style={[s.chip,status===x&&s.chipAtivo]}><Text style={{color:status===x?"white":"#555"}}>{x}</Text></TouchableOpacity>)}</ScrollView>
    <Text style={s.contagem}>{filtrados.length} lançamento(s)</Text>
    <ScrollView>{filtrados.map((x,i)=><View key={`${x.natureza}-${x.id}-${i}`} style={s.card}><View style={{flex:1}}><Text style={s.nome}>{x.nome}</Text><Text style={s.detalhe}>{x.categoria} · {x.data} · {x.status}</Text></View><Text style={[s.valor,{color:x.natureza==="Receita"?"#2E7D32":"#D32F2F"}]}>{dinheiro(x.valor)}</Text></View>)}</ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:"#F5F5F5",padding:18},header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:16},titulo:{fontSize:22,fontWeight:"bold",color:"#1A1A1A"},campo:{backgroundColor:"white",borderRadius:10,paddingHorizontal:12,paddingVertical:11,fontSize:14},filtros:{flexDirection:"row",gap:8,marginTop:8},data:{flex:1},opcoes:{maxHeight:48,marginVertical:8},chip:{paddingHorizontal:13,paddingVertical:9,backgroundColor:"white",borderRadius:20,marginRight:8},chipAtivo:{backgroundColor:"#00897B"},contagem:{fontSize:12,color:"#777",marginBottom:8},card:{backgroundColor:"white",padding:14,borderRadius:13,marginBottom:9,flexDirection:"row",alignItems:"center",gap:8},nome:{fontWeight:"bold",fontSize:15,color:"#222"},detalhe:{fontSize:12,color:"#777",marginTop:4},valor:{fontWeight:"bold",fontSize:13}});
