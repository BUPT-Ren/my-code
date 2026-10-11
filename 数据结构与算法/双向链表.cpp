
//双向链表

/*
  每一个节点除了数据域，还有next指针域指向下一个节点，
  pre指针域指向前一个节点
  头节点的pre是NULL，尾节点的next是NULL

*/
#include<iostream>

using namespace std;

//定义双向链表的节点类型
//c++开源库的标准写法
struct Node{
    Node(int data = 0):
        data_(data),
        next_(nullptr),
        pre_(nullptr)
        {}
    int data_ ;//数据域
    Node *next_; //指向下一个节点
    Node *pre_; //指向上一个节点
};

//双向链表
class DoubleLink{
    public:
        DoubleLink(){
        //Node* head_ = new Node();  定义一个局部变量head_ 会覆盖成员变量
        head_ = new Node();
        }
        ~DoubleLink(){
            Node *p = head_;
            while (p != nullptr){
                head_ = head_->next_;
                delete p;
                p = head_;
            }
        }
    public:
        //头插法
        void InsertHead(int val){
            //创建一个新节点
            Node *node = new Node(val);
            //让node指向下一个节点
            node->next_ = head_->next_;
            //让node指向头节点
            node->pre_ = head_;
            //存在第一节点
            if (head_->next_ != nullptr){
                //让第一节点指向新节点
                head_->next_->pre_ = node;
            }
            //让头节点指向新节点
            head_->next_ = node;
        }
        //尾插法
        void InsertTail(int val){
            Node *node  = new Node(val);
            Node *p = head_;
            //如果存在第一节点
            //尾插法 要先找到尾节点
            while(p->next_ != nullptr){
                p = p->next_;
            }
            //让p指向尾节点
            node->pre_ = p;
            p->next_ = node;
        }
        //双向链表的节点删除
        //双向链表删除指定节点只需要一个指针
        void Remove(int val){
            Node *p = head_->next_;//让p指向第一个节点
            while (p != nullptr){
                if(p->data_ == val){
                    //删除p指向的节点
                    p->pre_->next_ = p->next_;
                    if (p->next_ != nullptr){
                        p->next_->pre_ = p->pre_;
                    }
                    Node *next = p->next_;//记录
                    delete p; //此时p为野指针
                    p = next;
                }
                else{
                    p = p->next_;
                }
            }
        }
        //节点搜索
        bool Find(int val){
            Node *p = head_->next_;
            while (p != nullptr){
                if (p->data_ == val){
                    return true;
                }
                p = p->next_;
            }
            return false;
        }
        //链表节点的输出函数
        void show(){
            Node *p = head_->next_;
            while(p != nullptr){
                cout << p->data_ << " ";
                p = p->next_;
            }
            cout << endl;
        }

        //反向输出（利用 pre_ 指针），验证双向链接正确
        void showReverse(){
            Node *p = head_;
            while(p->next_ != nullptr){
                p = p->next_;
            }
            while(p != head_){
                cout << p->data_ << " ";
                p = p->pre_;
            }
            cout << endl;
        }
    private:
        Node *head_;
};

int main(){
    // 头插法
    {
        DoubleLink list;
        list.InsertHead(1);
        list.InsertHead(2);
        list.InsertHead(3);
        cout << "头插 1,2,3 (正向应为 3 2 1): ";
        list.show();
        cout << "头插 1,2,3 (反向应为 1 2 3): ";
        list.showReverse();
    }
    // 尾插法
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        cout << "尾插 1,2,3 (正向应为 1 2 3): ";
        list.show();
        cout << "尾插 1,2,3 (反向应为 3 2 1): ";
        list.showReverse();
    }
    // 混合操作
    {
        DoubleLink list;
        list.InsertHead(1);
        list.InsertTail(2);
        list.InsertHead(3);
        list.InsertTail(4);
        cout << "混合 (正向应为 3 1 2 4): ";
        list.show();
        cout << "混合 (反向应为 4 2 1 3): ";
        list.showReverse();
    }
    // 节点搜索 Find
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        cout << "搜索 2 (应为 1): " << list.Find(2) << endl;
        cout << "搜索 5 (应为 0): " << list.Find(5) << endl;
    }
    // 删除头节点
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(1);
        cout << "删除头 1 (应为 2 3): ";
        list.show();
    }
    // 删除中间节点
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(2);
        cout << "删除中间 2 (应为 1 3): ";
        list.show();
    }
    // 删除尾节点
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(3);
        cout << "删除尾 3 (应为 1 2): ";
        list.show();
    }
    // 删除唯一节点
    {
        DoubleLink list;
        list.InsertTail(1);
        list.Remove(1);
        cout << "删除唯一节点 1 (应为空): ";
        list.show();
    }
    // 删除不存在的值
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.Remove(99);
        cout << "删除不存在 99 (应为 1 2): ";
        list.show();
    }
    // 删除重复值
    {
        DoubleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(1);
        list.InsertTail(3);
        list.Remove(1);
        cout << "删除重复值 1 (正向应为 2 3): ";
        list.show();
        cout << "删除重复值 1 (反向应为 3 2): ";
        list.showReverse();
    }
    return 0;
}